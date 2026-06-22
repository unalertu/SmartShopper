/**
 * Location service utilities.
 * Background geofencing with tier-aware soft limits.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { geoEngine } from "./geoEngine";
import { notificationEngine } from "./notificationEngine";
import { sendLocalNotification } from "./notificationService";
import { notificationAnalytics } from "./notificationAnalytics";
import { NOTIFICATION_CONSTANTS } from "../constants";

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

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }

  if (!data) return;

  const { locations } = data as any;
  if (!locations || locations.length === 0) return;

  const location = locations[0];
  const { latitude, longitude, speed } = location.coords;

  // 1. Read settings
  const settings = await getSettingsFromStorage();

  // 2. GUARD: Ensure notifications are enabled globally and for background
  if (!settings.notificationsEnabled || !settings.backgroundNotifications) return;

  // 3. SPEED CHECK
  if (!notificationEngine.isUserLikelyWalking(speed)) return;

  // 4. FIND NEARBY STORES
  const nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly);
  
  if (nearbyStores.length === 0) {
    // Clear dwell timers if no stores are nearby
    dwellTimers.clear();
    return;
  }

  // 5. ACTIVE LIST CHECK
  const hasActiveList = await geoEngine.hasActiveShoppingList();
  if (!hasActiveList) return;

  // 6. DWELL TIME VALIDATION (in-memory)
  const nearbyIds = new Set(nearbyStores.map((s) => s.id));
  
  // Clean up old timers
  for (const [id] of dwellTimers) {
    if (!nearbyIds.has(id)) {
      dwellTimers.delete(id);
    }
  }

  const dwelledStores: typeof nearbyStores = [];
  const now = Date.now();

  for (const store of nearbyStores) {
    if (!dwellTimers.has(store.id)) {
      // Start timer
      dwellTimers.set(store.id, now);
    } else {
      const entryTime = dwellTimers.get(store.id)!;
      if (now - entryTime >= NOTIFICATION_CONSTANTS.DWELL_TIME_MS) {
        dwelledStores.push(store);
      }
    }
  }

  if (dwelledStores.length === 0) return;

  // 7. PICK BEST STORE
  const bestStore = await notificationEngine.pickBestStore(dwelledStores);
  if (!bestStore) return;

  // 8. SHOULD SEND (Cooldowns, Tier limits, Quiet hours)
  const decision = await notificationEngine.shouldSendLocationNotification({
    storeId: bestStore.id,
    isPro: settings.isPro,
    nightNotificationsEnabled: settings.nightNotificationsEnabled,
  });

  if (!decision.allowed) {
    console.log(`Notification suppressed: ${decision.reason}`);
    return;
  }

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
          distanceInterval: 100,
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
