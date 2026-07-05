/**
 * Location service utilities.
 * Background geofencing with tier-aware soft limits.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { geoEngine } from "./geoEngine";
import { notificationAnalytics } from "./notificationAnalytics";
import { sendLocalNotification } from "./notificationService";
import { useSettingsStore, NotificationSensitivity } from "../store/useSettingsStore";
import { NOTIFICATION_CONSTANTS, getAlertDistanceMeters, getMaxNotificationsPerStorePerDay } from "../constants";
import { useStatsStore } from "../store/useStatsStore";
import { useLocationStore } from "../store/useLocationStore";
import { fetchMarkets } from "./overpassService";
import { notificationEngine } from "./notificationEngine";

const SEARCH_RADIUS = 1000;
const OVERPASS_FETCH_RADIUS = 2500;
const MIN_NEARBY_CACHE_THRESHOLD = 3;

let speedHistory: { speed: number; timestamp: number }[] = [];
const geofenceState: Map<string, 'outside' | 'inside'> = new Map();
const dwellTimers = new Map<string, number>();
const exitGraceTimers = new Map<string, number>();
const notifiedStores = new Map<string, { lat: number; lon: number; timestamp: number }>();

import { getCurrentLocation, getDistance } from "./locationUtils";

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
};

export const BACKGROUND_LOCATION_TASK = "background-location-task";

export const getDwellTimersState = () => {
  return Array.from(dwellTimers.entries()).map(([id, entryTime]) => ({
    id,
    entryTime,
  }));
};

export const getSettingsFromStorage = async () => {
  try {
    const data = await AsyncStorage.getItem("settings-storage");
    if (data) {
      const parsed = JSON.parse(data);
      const state = parsed?.state || {};
      return {
        isPro: state.isPro === true,
        notificationsEnabled: state.notificationsEnabled !== false, // default true if not set
        backgroundNotifications: state.backgroundNotifications !== false,
        savedStoresOnly: state.savedStoresOnly === true,
        nightNotificationsEnabled: false, // Could be added to store later
        mutedDays: Array.isArray(state.mutedDays) ? state.mutedDays : [],
        scheduleEnabled: state.scheduleEnabled === true,
        allowedDays: Array.isArray(state.allowedDays) ? state.allowedDays : [0, 1, 2, 3, 4, 5, 6],
        quietHoursEnabled: state.quietHoursEnabled === true,
        allowedHoursStart: typeof state.allowedHoursStart === 'number' ? state.allowedHoursStart : 8,
        allowedHoursEnd: typeof state.allowedHoursEnd === 'number' ? state.allowedHoursEnd : 22,
        shoppingListReminders: state.shoppingListReminders !== false,
        notificationSensitivity: (state.notificationSensitivity || 'balanced') as NotificationSensitivity,
        maxAlertsPerDay: state.maxAlertsPerDay ?? 5,
        maxNotificationsPerStorePerDay: getMaxNotificationsPerStorePerDay(state.isPro === true),
      };
    }
  } catch (e) {
    console.error("getSettingsFromStorage error", e);
  }
  return {
    isPro: false,
    notificationsEnabled: true,
    backgroundNotifications: true,
    savedStoresOnly: false,
    nightNotificationsEnabled: false,
    mutedDays: [],
    scheduleEnabled: false,
    allowedDays: [0, 1, 2, 3, 4, 5, 6],
    quietHoursEnabled: false,
    allowedHoursStart: 8,
    allowedHoursEnd: 22,
    shoppingListReminders: true,
    notificationSensitivity: 'balanced' as NotificationSensitivity,
    maxAlertsPerDay: 5 as number | 'unlimited',
    maxNotificationsPerStorePerDay: getMaxNotificationsPerStorePerDay(false),
  };
};

import { geofenceManager } from "./geofenceManager";

export const processLocationUpdate = async (location: Location.LocationObject) => {
  const { addDebugLog, incrementDebugMetric, setDebugMetric } = useLocationStore.getState();
  incrementDebugMetric("backgroundExecutions");
  addDebugLog("Background task started");

  const { latitude, longitude, speed, accuracy } = location.coords;
  addDebugLog(`Speed: ${speed ? speed.toFixed(2) : '0.00'} m/s, Acc: ${accuracy ? accuracy.toFixed(0) : '?'}m`);

  // 1. Settings Guard
  const settings = await getSettingsFromStorage();
  if (!settings.notificationsEnabled || !settings.backgroundNotifications || !settings.shoppingListReminders) {
    addDebugLog("Notifications or location-based alerts disabled in settings");
    return;
  }

  // 1b. RESOLVE ALERT DISTANCE (single source of truth)
  const alertDistance = getAlertDistanceMeters(settings.notificationSensitivity);
  addDebugLog(`Alert distance: ${alertDistance}m (${settings.notificationSensitivity})`);

  // 2. GPS Accuracy Filter
  if (accuracy && accuracy > NOTIFICATION_CONSTANTS.MAX_GPS_ACCURACY) {
    addDebugLog(`GPS accuracy too low: ${accuracy.toFixed(0)}m. Ignoring.`);
    return;
  }

  // 3. Timestamp Validation
  const now = Date.now();
  if (now - location.timestamp > NOTIFICATION_CONSTANTS.MAX_LOCATION_AGE_MS) {
    addDebugLog(`Location too old: ${now - location.timestamp}ms. Ignoring.`);
    return;
  }

  // 4. Moving Average Speed
  if (speed !== null) {
    speedHistory.push({ speed, timestamp: now });
    // Keep only last N
    if (speedHistory.length > NOTIFICATION_CONSTANTS.SPEED_WINDOW_SIZE) {
      speedHistory.shift();
    }
    const avgSpeed = speedHistory.reduce((sum, h) => sum + h.speed, 0) / speedHistory.length;
    
    if (avgSpeed > NOTIFICATION_CONSTANTS.SPEED_THRESHOLD_MS) {
      addDebugLog(`High avg speed detected: ${avgSpeed.toFixed(2)}m/s. Ignoring.`);
      return;
    }
  }

  // 5. Clean up old notified stores (> 24h)
  for (const [id, data] of notifiedStores) {
    if (now - data.timestamp > 24 * 60 * 60 * 1000) {
      notifiedStores.delete(id);
    }
  }

  // 6. Unpurchased Items (Single read)
  const unpurchasedItems = await geoEngine.getUnpurchasedItems();
  if (unpurchasedItems.length === 0) {
    addDebugLog("No active lists. Skipping Overpass fetch and geofencing.");
    return;
  }

  // 7. FIND NEARBY STORES (Exclude saved)
  let nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS, true);
  addDebugLog(`Nearby cached unsaved stores: ${nearbyStores.length}`);

  // 8. OVERPASS FETCH (Cache miss)
  if (nearbyStores.length < MIN_NEARBY_CACHE_THRESHOLD && !settings.savedStoresOnly) {
    const lastCoords = useLocationStore.getState().lastBackgroundFetchCoords;
    let shouldFetch = true;
    if (lastCoords) {
      const distFromLastFetch = getDistance(latitude, longitude, lastCoords.latitude, lastCoords.longitude);
      if (distFromLastFetch < 1500) {
        addDebugLog(`Fetch throttled: Yes (${distFromLastFetch.toFixed(0)}m from last fetch)`);
        setDebugMetric("fetchThrottled", true);
        shouldFetch = false;
      }
    }

    if (shouldFetch) {
      setDebugMetric("fetchThrottled", false);
      addDebugLog("Overpass fetch started");
      incrementDebugMetric("overpassRequests");
      try {
        const bbox = geoEngine.getBoundingBox(latitude, longitude, OVERPASS_FETCH_RADIUS);
        const newMarkets = await fetchMarkets(bbox.south, bbox.west, bbox.north, bbox.east);
        addDebugLog(`Overpass fetch completed (${newMarkets.length} stores)`);
        
        if (newMarkets.length > 0) {
          useLocationStore.getState().appendCachedMarkets(newMarkets);
          useLocationStore.getState().setLastBackgroundFetchCoords({ latitude, longitude });
          nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS, true);
        }
      } catch (e: any) {
        addDebugLog(`Overpass fetch failed: ${e.message}`);
      }
    }
  }

  // 9. FILTER INSIDE STORES & MIN EXIT DISTANCE
  const insideStores = nearbyStores.filter(s => {
    if (s.distance > alertDistance) return false;
    
    const notified = notifiedStores.get(s.id);
    if (notified) {
      const distFromNotify = getDistance(latitude, longitude, notified.lat, notified.lon);
      if (distFromNotify < NOTIFICATION_CONSTANTS.MIN_EXIT_DISTANCE) {
        addDebugLog(`Still too close to notified coords for ${s.name} (${distFromNotify.toFixed(0)}m)`);
        return false;
      } else {
        notifiedStores.delete(s.id); // cleared min exit distance
      }
    }
    return true;
  });

  const currentInsideIds = new Set(insideStores.map(s => s.id));

  // 10. ENTER DETECTION STATE MACHINE
  const enterEvents: string[] = [];
  const exitEvents: string[] = [];
  
  for (const id of currentInsideIds) {
    if (geofenceState.get(id) !== 'inside') {
      enterEvents.push(id);
      geofenceState.set(id, 'inside');
    }
  }
  for (const [id, state] of geofenceState) {
    if (state === 'inside' && !currentInsideIds.has(id)) {
      exitEvents.push(id);
      geofenceState.set(id, 'outside');
    }
  }

  // 11. EXIT GRACE PERIOD
  for (const id of exitEvents) {
    if (!exitGraceTimers.has(id)) {
      exitGraceTimers.set(id, now);
      addDebugLog(`Exit grace started for ${id}`);
    }
  }

  for (const [id, exitTime] of exitGraceTimers) {
    if (currentInsideIds.has(id)) {
      exitGraceTimers.delete(id); // re-entered
      addDebugLog(`Re-entered ${id}, cleared exit grace`);
    } else if (now - exitTime > NOTIFICATION_CONSTANTS.EXIT_GRACE_PERIOD_MS) {
      dwellTimers.delete(id);
      exitGraceTimers.delete(id);
      addDebugLog(`Exit grace expired for ${id}, cleared dwell timer`);
    }
  }

  // 12. DWELL TIME
  const dwelledStores: typeof nearbyStores = [];
  for (const store of insideStores) {
    // We only process unsaved stores in this pipeline
    if (enterEvents.includes(store.id)) {
      if (!dwellTimers.has(store.id)) {
        addDebugLog(`Started dwell timer for ${store.name}`);
        dwellTimers.set(store.id, now);
      }
    } else if (dwellTimers.has(store.id)) {
      const entryTime = dwellTimers.get(store.id)!;
      const elapsed = now - entryTime;
      if (elapsed >= NOTIFICATION_CONSTANTS.DWELL_TIME_MS) {
        dwelledStores.push(store);
      }
    }
  }

  if (dwelledStores.length === 0) {
    addDebugLog("No stores meeting dwell time");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }
  addDebugLog(`Stores meeting dwell time: ${dwelledStores.map(s => s.name).join(', ')}`);

  // Record store visits
  for (const store of dwelledStores) {
    useStatsStore.getState().recordStoreVisit(store.id);
  }

  // 13. PICK BEST STORE
  const bestStore = await notificationEngine.pickBestStore(dwelledStores, unpurchasedItems.length, alertDistance);
  if (!bestStore) {
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 14. SHOULD SEND
  const eventId = dwellTimers.get(bestStore.id) || now;
  const decision = await notificationEngine.shouldSendLocationNotification({
    storeId: bestStore.id,
    eventId,
    isPro: settings.isPro,
    maxAlertsPerDay: settings.maxAlertsPerDay,
    maxNotificationsPerStorePerDay: settings.maxNotificationsPerStorePerDay,
    scheduleEnabled: settings.scheduleEnabled,
    allowedDays: settings.allowedDays,
    quietHoursEnabled: settings.quietHoursEnabled,
    allowedHoursStart: settings.allowedHoursStart,
    allowedHoursEnd: settings.allowedHoursEnd,
    shoppingListReminders: settings.shoppingListReminders,
  });

  if (!decision.allowed) {
    addDebugLog(`Notification blocked: ${decision.reason}`);
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 15. SEND NOTIFICATION
  addDebugLog("Notification triggered");
  incrementDebugMetric("notificationsTriggered");

  const content = await notificationEngine.buildNotificationContent(
    bestStore.name,
    unpurchasedItems,
    settings.isPro,
    settings.maxAlertsPerDay
  );
  await sendLocalNotification(content.title, content.body, "geofence-alerts");

  await notificationAnalytics.recordNotification(
    content.title,
    content.body,
    bestStore.id,
    eventId
  );
  
  dwellTimers.delete(bestStore.id);
  notifiedStores.set(bestStore.id, { lat: latitude, lon: longitude, timestamp: now });

  // 16. TRIGGER REBALANCE
  void geofenceManager.rebalanceGeofences(latitude, longitude);
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (!data) return;
  const { locations } = data as any;
  if (!locations || locations.length === 0) return;
  
  await processLocationUpdate(locations[0]);
});

export const startBackgroundLocationTracking = async () => {
  try {
    const settings = await getSettingsFromStorage();
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    
    if (settings.savedStoresOnly) {
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        useLocationStore.getState().addDebugLog("[Location] Background tracking stopped (Saved Stores Only enabled)");
      } else {
        useLocationStore.getState().addDebugLog("[Location] Background tracking skipped (Saved Stores Only already enabled)");
      }
      return;
    }

    if (!hasStarted) {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status === "granted") {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000,
          distanceInterval: 300,
          showsBackgroundLocationIndicator: true,
        });
        useLocationStore.getState().addDebugLog("[Location] Background tracking started");
      }
    }
  } catch (e) {
    console.warn("Failed to start background tracking (possibly denied mode fallback):", e);
  }
};

export const stopBackgroundLocationTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      
      // Verify that it actually stopped
      const isStillRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!isStillRunning) {
        useLocationStore.getState().addDebugLog("[Location] Background tracking successfully stopped");
      } else {
        useLocationStore.getState().addDebugLog("[Location] WARNING: Background tracking is still active after stop request");
      }
    }
    
    // Clean up background location memory state
    speedHistory = [];
    geofenceState.clear();
    dwellTimers.clear();
    exitGraceTimers.clear();
    notifiedStores.clear();
  } catch (e) {
    console.warn("Failed to stop background tracking:", e);
  }
};

// getDistance moved to locationUtils.ts

/**
 * Handle a native geofence enter event.
 * Validates settings and dispatches notifications if conditions are met.
 */
export const handleGeofenceEnter = async (storeId: string) => {
  try {
    // 1. Memory lookup
    const store = geofenceManager.getStoreFromCache(storeId);
    if (!store) return; // Deleted

    // 2. Is Active?
    if (!store.isActive) return;

    // 3. Has Active List?
    const hasActiveList = await geoEngine.hasActiveShoppingList();
    if (!hasActiveList) return;

    // 4. Settings
    const settings = await getSettingsFromStorage();
    if (!settings.notificationsEnabled || !settings.shoppingListReminders) return;

    // 5. Unpurchased items
    const unpurchasedItems = await geoEngine.getUnpurchasedItems();
    if (unpurchasedItems.length === 0) return;

    // 6. Should Send?
    const eventId = Date.now();
    const decision = await notificationEngine.shouldSendLocationNotification({
      storeId: store.id,
      eventId,
      isPro: settings.isPro,
      maxAlertsPerDay: settings.maxAlertsPerDay,
      maxNotificationsPerStorePerDay: settings.maxNotificationsPerStorePerDay,
      scheduleEnabled: settings.scheduleEnabled,
      allowedDays: settings.allowedDays,
      quietHoursEnabled: settings.quietHoursEnabled,
      allowedHoursStart: settings.allowedHoursStart,
      allowedHoursEnd: settings.allowedHoursEnd,
      shoppingListReminders: settings.shoppingListReminders,
    });
    if (!decision.allowed) return;

    // SEND
    const content = await notificationEngine.buildNotificationContent(
      store.name,
      unpurchasedItems,
      settings.isPro,
      settings.maxAlertsPerDay
    );
    await sendLocalNotification(content.title, content.body, 'geofence-alerts');
    await notificationAnalytics.recordNotification(content.title, content.body, store.id, eventId);
  } catch (e) {
    console.error("handleGeofenceEnter error", e);
  }
};
