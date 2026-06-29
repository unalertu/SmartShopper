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

const SEARCH_RADIUS = 1000;
const OVERPASS_FETCH_RADIUS = 2500;
const MIN_NEARBY_CACHE_THRESHOLD = 3;

let consecutiveHighSpeedCount = 0;
const REQUIRED_HIGH_SPEED_COUNT = 3;
const HIGH_SPEED_THRESHOLD = 6.94; // ~25 km/h

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

// Module-level in-memory Map — lost on app kill
const dwellTimers = new Map<string, number>();

export const getDwellTimersState = () => {
  return Array.from(dwellTimers.entries()).map(([id, entryTime]) => ({
    id,
    entryTime,
  }));
};

const getSettingsFromStorage = async () => {
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

export const processLocationUpdate = async (location: Location.LocationObject) => {
  const { addDebugLog, incrementDebugMetric, setDebugMetric } = useLocationStore.getState();
  incrementDebugMetric("backgroundExecutions");
  addDebugLog("Background task started");

  const { latitude, longitude, speed } = location.coords;
  addDebugLog(`Speed: ${speed ? speed.toFixed(2) : '0.00'} m/s`);

  // 1. Read settings
  const settings = await getSettingsFromStorage();

  // 2. GUARD: Ensure notifications are enabled globally and for background
  if (!settings.notificationsEnabled || !settings.backgroundNotifications) {
    addDebugLog("Notifications disabled in settings");
    return;
  }

  // 3. SPEED CHECK
  if (speed !== null && speed > HIGH_SPEED_THRESHOLD) {
    consecutiveHighSpeedCount++;
    addDebugLog(`High speed detected: ${speed.toFixed(2)}m/s. Count: ${consecutiveHighSpeedCount}`);
    setDebugMetric("consecutiveHighSpeedCount", consecutiveHighSpeedCount);
    if (consecutiveHighSpeedCount >= REQUIRED_HIGH_SPEED_COUNT) {
      addDebugLog("Ignored update due to sustained high speed");
      return;
    }
  } else {
    consecutiveHighSpeedCount = 0;
    setDebugMetric("consecutiveHighSpeedCount", 0);
  }

  // 4. FIND NEARBY STORES (CACHE-FIRST)
  let nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS);
  addDebugLog(`Nearby cached stores: ${nearbyStores.length}`);
  
  // 5. CACHE MISS & THROTTLE LOGIC
  if (nearbyStores.length < MIN_NEARBY_CACHE_THRESHOLD && !settings.savedStoresOnly) {
    addDebugLog("Threshold miss");
    
    // Check if there are active unpurchased items before doing ANY network requests
    const hasActiveList = await geoEngine.hasActiveShoppingList();
    addDebugLog(`Active list: ${hasActiveList ? 'Yes' : 'No'}`);
    if (!hasActiveList) {
      addDebugLog("No active lists. Skipping Overpass fetch.");
    } else {
      // Check throttle (1.5km from last fetch)
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
        addDebugLog("Fetch throttled: No");
        addDebugLog("Overpass fetch started");
        incrementDebugMetric("overpassRequests");
        try {
          const bbox = geoEngine.getBoundingBox(latitude, longitude, OVERPASS_FETCH_RADIUS);
          const newMarkets = await fetchMarkets(bbox.south, bbox.west, bbox.north, bbox.east);
          addDebugLog(`Overpass fetch completed (${newMarkets.length} stores)`);
          
          if (newMarkets.length > 0) {
            useLocationStore.getState().appendCachedMarkets(newMarkets);
            useLocationStore.getState().setLastBackgroundFetchCoords({ latitude, longitude });
            addDebugLog(`Cache size: ${useLocationStore.getState().cachedMarkets.length}`);
            
            // Re-evaluate nearby stores with updated cache
            nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS);
            addDebugLog(`Re-evaluated: Found ${nearbyStores.length} nearby stores in cache.`);
          }
        } catch (e: any) {
          addDebugLog(`Overpass fetch failed: ${e.message}`);
        }
      }
    }
  } else {
    // If we didn't go through the threshold miss block, just log active list status for clarity
    const hasActiveList = await geoEngine.hasActiveShoppingList();
    addDebugLog(`Active list: ${hasActiveList ? 'Yes' : 'No'}`);
  }

  const insideStores = nearbyStores.filter(s => s.distance <= s.radius);

  if (insideStores.length === 0) {
    addDebugLog("Not inside any store geofence, clearing dwell timers");
    dwellTimers.clear();
    return;
  }

  // 6. ACTIVE LIST CHECK (For notification evaluation)
  const hasActiveListFinal = await geoEngine.hasActiveShoppingList();
  if (!hasActiveListFinal) return;

  // 6. DWELL TIME VALIDATION (in-memory)
  const insideIds = new Set(insideStores.map((s) => s.id));
  
  // Clean up old timers
  for (const [id] of dwellTimers) {
    if (!insideIds.has(id)) {
      dwellTimers.delete(id);
    }
  }

  const dwelledStores: typeof nearbyStores = [];
  const now = Date.now();

  for (const store of insideStores) {
    if (!dwellTimers.has(store.id)) {
      addDebugLog(`Started dwell timer for ${store.name}`);
      // Start timer
      dwellTimers.set(store.id, now);
    } else {
      const entryTime = dwellTimers.get(store.id)!;
      const elapsed = now - entryTime;
      addDebugLog(`Dwell time for ${store.name}: ${elapsed}ms (target: ${NOTIFICATION_CONSTANTS.DWELL_TIME_MS}ms)`);
      if (elapsed >= NOTIFICATION_CONSTANTS.DWELL_TIME_MS) {
        dwelledStores.push(store);
      }
    }
  }

  if (dwelledStores.length === 0) {
    addDebugLog("Dwell time not met");
    return;
  }
  addDebugLog(`Stores meeting dwell time: ${dwelledStores.map(s => s.name).join(', ')}`);
  
  // Record store visits (independent of notification logic)
  for (const store of dwelledStores) {
    useStatsStore.getState().recordStoreVisit(store.id);
  }

  // 7. PICK BEST STORE
  const bestStore = await notificationEngine.pickBestStore(dwelledStores);
  if (!bestStore) {
    addDebugLog("No best store picked (cooldowns, etc.)");
    return;
  }

  addDebugLog(`Checking restrictions for ${bestStore.name}`);
  // 8. SHOULD SEND (Cooldowns, Tier limits, Quiet hours)
  const decision = await notificationEngine.shouldSendLocationNotification({
    storeId: bestStore.id,
    isPro: settings.isPro,
    nightNotificationsEnabled: settings.nightNotificationsEnabled,
  });

  if (!decision.allowed) {
    addDebugLog(`Notification blocked: ${decision.reason}`);
    return;
  }

  addDebugLog("Notification triggered");
  const { incrementDebugMetric: idm } = useLocationStore.getState();
  idm("notificationsTriggered");

  // 9. SEND NOTIFICATION
  const content = notificationEngine.buildNotificationContent(bestStore.name);
  await sendLocalNotification(content.title, content.body, "geofence-alerts");

  // 10. RECORD in analytics store
  await notificationAnalytics.recordNotification(
    content.title,
    content.body,
    bestStore.id
  );
  
  // Once sent, remove from dwell timer to avoid immediate re-evaluation if cooldowns fail for some reason
  dwellTimers.delete(bestStore.id);
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
