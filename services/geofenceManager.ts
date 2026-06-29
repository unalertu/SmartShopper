import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { SavedLocation } from '../store/useLocationStore';
import { getDistance, getSettingsFromStorage } from './locationService';
import { geoEngine } from './geoEngine';
import { notificationEngine } from './notificationEngine';
import { sendLocalNotification } from './notificationService';
import { notificationAnalytics } from './notificationAnalytics';
import { NOTIFICATION_CONSTANTS } from '../constants';

const GEOFENCE_TASK = 'saved-store-geofence-task';

// In-memory store cache — no AsyncStorage lookups during enter events
const storeCache: Map<string, SavedLocation> = new Map();

// Desired regions (not yet committed to native)
let desiredRegions: Location.LocationRegion[] = [];

// Currently active region IDs in native
let activeRegionIds: Set<string> = new Set();

// Rebalance throttle state
let lastRebalanceCoords: { latitude: number; longitude: number } | null = null;

let commitTimer: ReturnType<typeof setTimeout> | null = null;

function clampRadius(radius: number): number {
  return Math.max(
    NOTIFICATION_CONSTANTS.MIN_GEOFENCE_RADIUS,
    Math.min(NOTIFICATION_CONSTANTS.MAX_GEOFENCE_RADIUS, radius)
  );
}

function buildRegion(location: SavedLocation): Location.LocationRegion {
  return {
    identifier: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    radius: clampRadius(location.radius || NOTIFICATION_CONSTANTS.DEFAULT_GEOFENCE_RADIUS),
    notifyOnEnter: true,
    notifyOnExit: false,
  };
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function scheduleCommit() {
  if (commitTimer) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    void geofenceManager.commitGeofences();
  }, NOTIFICATION_CONSTANTS.COMMIT_DEBOUNCE_MS);
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error("GEOFENCE_TASK error:", error);
    return;
  }
  const { eventType, region } = data as { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
  
  if (eventType === Location.GeofencingEventType.Enter) {
    await processGeofenceEnter(region);
  }
});

async function processGeofenceEnter(region: Location.LocationRegion) {
  try {
    if (!region.identifier) return;

    // 1. Memory lookup
    const store = geofenceManager.getStoreFromCache(region.identifier);
    if (!store) return; // Deleted

    // 2. Is Active?
    if (!store.isActive) return;

    // 3. Has Active List?
    const hasActiveList = await geoEngine.hasActiveShoppingList();
    if (!hasActiveList) return;

    // 4. Settings
    const settings = await getSettingsFromStorage();
    if (!settings.notificationsEnabled) return;

    // 5. Unpurchased items (Single read)
    const unpurchasedItems = await geoEngine.getUnpurchasedItems();
    if (unpurchasedItems.length === 0) return;

    // 6. Should Send?
    const decision = await notificationEngine.shouldSendLocationNotification({
      storeId: store.id,
      isPro: settings.isPro,
      nightNotificationsEnabled: settings.nightNotificationsEnabled,
      mutedDays: settings.mutedDays,
    });
    if (!decision.allowed) return;

    // SEND
    const content = await notificationEngine.buildNotificationContent(store.name, unpurchasedItems);
    await sendLocalNotification(content.title, content.body, 'geofence-alerts');
    await notificationAnalytics.recordNotification(content.title, content.body, store.id);
  } catch (e) {
    console.error("processGeofenceEnter error", e);
  }
}

export const geofenceManager = {
  registerSavedStore(location: SavedLocation): void {
    storeCache.set(location.id, location);
    const region = buildRegion(location);
    desiredRegions = desiredRegions.filter((r) => r.identifier !== location.id);
    desiredRegions.push(region);
    scheduleCommit();
  },

  unregisterSavedStore(id: string): void {
    storeCache.delete(id);
    desiredRegions = desiredRegions.filter((r) => r.identifier !== id);
    scheduleCommit();
  },

  async syncSavedStores(): Promise<void> {
    try {
      const locations = await geoEngine.getLocations();
      storeCache.clear();
      desiredRegions = [];
      for (const loc of locations) {
        storeCache.set(loc.id, loc);
        if (loc.isActive) {
          desiredRegions.push(buildRegion(loc));
        }
      }
      await geofenceManager.commitGeofences(); // Instant commit on sync
    } catch (e) {
      console.error("syncSavedStores error:", e);
    }
  },

  async rebalanceGeofences(lat: number, lon: number): Promise<void> {
    if (desiredRegions.length <= NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES) return;

    if (lastRebalanceCoords) {
      const dist = getDistance(lat, lon, lastRebalanceCoords.latitude, lastRebalanceCoords.longitude);
      if (dist < NOTIFICATION_CONSTANTS.REBALANCE_MIN_DISTANCE) return;
    }

    lastRebalanceCoords = { latitude: lat, longitude: lon };
    await geofenceManager.commitGeofences({ latitude: lat, longitude: lon });
  },

  async commitGeofences(userLocation?: { latitude: number; longitude: number }): Promise<void> {
    try {
      let regionsToRegister = [...desiredRegions];

      if (regionsToRegister.length > NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES) {
        if (userLocation) {
          regionsToRegister.sort(
            (a, b) =>
              getDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
              getDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          );
        }
        regionsToRegister = regionsToRegister.slice(0, NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES);
      }

      const newIds = new Set(regionsToRegister.map((r) => r.identifier).filter((id): id is string => id !== undefined));

      if (setsEqual(newIds, activeRegionIds)) return; // No change

      if (regionsToRegister.length === 0) {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
        if (hasStarted) await Location.stopGeofencingAsync(GEOFENCE_TASK);
        activeRegionIds.clear();
        return;
      }

      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn("Background location permission is required for geofencing.");
        return;
      }

      await Location.startGeofencingAsync(GEOFENCE_TASK, regionsToRegister);
      activeRegionIds = newIds;
    } catch (e) {
      console.error("commitGeofences error:", e);
    }
  },

  getStoreFromCache(id: string): SavedLocation | undefined {
    return storeCache.get(id);
  },
};
