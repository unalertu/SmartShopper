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
import { useSettingsStore } from "../store/useSettingsStore";
import { NOTIFICATION_CONSTANTS } from "../constants";
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

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
};

export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    return null;
  }
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
  if (!settings.notificationsEnabled || !settings.backgroundNotifications) {
    addDebugLog("Notifications disabled in settings");
    return;
  }

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
    if (s.distance > (s.radius || NOTIFICATION_CONSTANTS.DEFAULT_GEOFENCE_RADIUS)) return false;
    
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
  const bestStore = await notificationEngine.pickBestStore(dwelledStores, unpurchasedItems.length);
  if (!bestStore) {
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 14. SHOULD SEND
  const decision = await notificationEngine.shouldSendLocationNotification({
    storeId: bestStore.id,
    isPro: settings.isPro,
    nightNotificationsEnabled: settings.nightNotificationsEnabled,
  });

  if (!decision.allowed) {
    addDebugLog(`Notification blocked: ${decision.reason}`);
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 15. SEND NOTIFICATION
  addDebugLog("Notification triggered");
  incrementDebugMetric("notificationsTriggered");

  const content = await notificationEngine.buildNotificationContent(bestStore.name, unpurchasedItems);
  await sendLocalNotification(content.title, content.body, "geofence-alerts");

  await notificationAnalytics.recordNotification(
    content.title,
    content.body,
    bestStore.id
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
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!hasStarted) {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status === "granted") {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000,
          distanceInterval: 300,
          showsBackgroundLocationIndicator: true,
        });
      }
    }
  } catch (e) {
    console.warn("Failed to start background tracking (possibly denied mode fallback):", e);
  }
};

/**
 * Calculate haversine distance between two coordinates in meters.
 */
export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
