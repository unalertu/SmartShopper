/**
 * Location service utilities.
 * Background geofencing with tier-aware soft limits.
 * 
 * IMPORTANT: Background notifications are NEVER disabled for free users.
 * Free users get up to 5 nearby-store alerts per day, prioritizing the closest store.
 * Pro users have no daily limits and can alert for all nearby stores.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { geoEngine } from "./geoEngine";
import { notificationEngine } from "./notificationEngine";

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
};

export const getCurrentLocation =
  async (): Promise<Location.LocationObject | null> => {
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

/**
 * Read isPro from the persisted settings store in AsyncStorage.
 * Used in background tasks where Zustand hooks aren't available.
 */
const getIsProFromStorage = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem("settings-storage");
    if (data) {
      const parsed = JSON.parse(data);
      return parsed?.state?.isPro === true;
    }
  } catch (e) {
    console.error("getIsProFromStorage error", e);
  }
  return false;
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude } = location.coords;
      
      const isPro = await getIsProFromStorage();
      const nearbyStores = await geoEngine.getNearbyStores(latitude, longitude);
      
      if (nearbyStores.length > 0) {
        const hasItems = await geoEngine.hasUnpurchasedItems();
        if (hasItems) {
          // Check if we can still send nearby alerts today
          const canSendNearby = await notificationEngine.canSendNearbyAlert(isPro);
          if (!canSendNearby) return;

          if (isPro) {
            // Pro: alert for all nearby stores (respecting per-store cooldowns)
            for (const store of nearbyStores) {
              const canSend = await notificationEngine.canSendStoreNotification(store.id);
              if (canSend) {
                await notificationEngine.dispatchNearbyAlert(
                  `You're near ${store.name}`,
                  `You have unpurchased items on your lists. Don't forget to shop at ${store.name}!`,
                  true
                );
              }
            }
          } else {
            // Free: prioritize the closest relevant store only
            const closestStore = nearbyStores[0]; // getNearbyStores returns sorted by distance
            const canSend = await notificationEngine.canSendStoreNotification(closestStore.id);
            if (canSend) {
              await notificationEngine.dispatchNearbyAlert(
                `You're near ${closestStore.name}`,
                `You have unpurchased items on your lists. Don't forget to shop at ${closestStore.name}!`,
                false
              );
            }
          }
        }
      }
    }
  }
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
