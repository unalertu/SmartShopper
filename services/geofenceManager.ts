import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { SavedLocation, useLocationStore } from '../store/useLocationStore';
import { getDistance, getSettingsFromStorage, getCurrentLocation } from './locationService';
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

// ─── Helpers ───────────────────────────────────────────────

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

function log(msg: string) {
  try {
    useLocationStore.getState().addDebugLog(`[Geofence] ${msg}`);
  } catch {
    // Store might not be ready during very early boot
  }
}

// ─── Location Fallback Chain ───────────────────────────────

async function resolveLocation(): Promise<{ latitude: number; longitude: number } | null> {
  // 1. Last known from Zustand store
  try {
    const storeLocation = useLocationStore.getState().userLocation;
    if (storeLocation) {
      log('Location source: lastKnownLocation (store)');
      return storeLocation;
    }
  } catch { /* store not ready */ }

  // 2. Last rebalance coords
  if (lastRebalanceCoords) {
    log('Location source: lastRebalanceCoords');
    return lastRebalanceCoords;
  }

  // 3. GPS query
  try {
    const current = await getCurrentLocation();
    if (current) {
      log('Location source: getCurrentLocation (GPS)');
      return { latitude: current.coords.latitude, longitude: current.coords.longitude };
    }
  } catch { /* permission denied or timeout */ }

  // 4. No location available
  log('Location source: none (alphabetical fallback)');
  return null;
}

// ─── Debounced Commit ──────────────────────────────────────

async function debouncedCommitWithLocation() {
  // Resolve location once, then commit with it
  const location = await resolveLocation();
  await geofenceManager.commitGeofences(location, 'debounced_commit');
}

function scheduleCommit() {
  if (commitTimer) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    void debouncedCommitWithLocation();
  }, NOTIFICATION_CONSTANTS.COMMIT_DEBOUNCE_MS);
}

// ─── Geofence Enter Task ──────────────────────────────────

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
    if (!settings.notificationsEnabled || !settings.shoppingListReminders) return;

    // 5. Unpurchased items (Single read)
    const unpurchasedItems = await geoEngine.getUnpurchasedItems();
    if (unpurchasedItems.length === 0) return;

    // 6. Should Send?
    const decision = await notificationEngine.shouldSendLocationNotification({
      storeId: store.id,
      isPro: settings.isPro,
      scheduleEnabled: settings.scheduleEnabled,
      allowedDays: settings.allowedDays,
      quietHoursEnabled: settings.quietHoursEnabled,
      allowedHoursStart: settings.allowedHoursStart,
      allowedHoursEnd: settings.allowedHoursEnd,
      shoppingListReminders: settings.shoppingListReminders,
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

// ─── Geofence Manager ─────────────────────────────────────

export const geofenceManager = {
  registerSavedStore(location: SavedLocation): void {
    storeCache.set(location.id, location);
    const region = buildRegion(location);
    desiredRegions = desiredRegions.filter((r) => r.identifier !== location.id);
    desiredRegions.push(region);
    log(`Store registered: ${location.name} (total desired: ${desiredRegions.length})`);
    scheduleCommit();
  },

  unregisterSavedStore(id: string): void {
    const store = storeCache.get(id);
    storeCache.delete(id);
    desiredRegions = desiredRegions.filter((r) => r.identifier !== id);
    log(`Store unregistered: ${store?.name || id} (total desired: ${desiredRegions.length})`);
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

      log(`Sync: ${locations.length} saved shops, ${desiredRegions.length} active`);

      // Resolve location for distance-based sorting
      const location = await resolveLocation();
      await geofenceManager.commitGeofences(location, 'app_launch');
    } catch (e) {
      console.error("syncSavedStores error:", e);
    }
  },

  async rebalanceGeofences(lat: number, lon: number): Promise<void> {
    // Skip rebalance if we have 20 or fewer desired regions (all fit, no sorting needed)
    if (desiredRegions.length <= NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES) return;

    // Throttle: only rebalance if moved >= REBALANCE_MIN_DISTANCE (1000m)
    if (lastRebalanceCoords) {
      const dist = getDistance(lat, lon, lastRebalanceCoords.latitude, lastRebalanceCoords.longitude);
      if (dist < NOTIFICATION_CONSTANTS.REBALANCE_MIN_DISTANCE) return;
      log(`Rebalance triggered: moved ${dist.toFixed(0)}m from last rebalance`);
    } else {
      log('Rebalance triggered: first location update');
    }

    lastRebalanceCoords = { latitude: lat, longitude: lon };
    await geofenceManager.commitGeofences({ latitude: lat, longitude: lon }, 'location_update');
  },

  async commitGeofences(
    userLocation: { latitude: number; longitude: number } | null,
    reason: string = 'unknown'
  ): Promise<void> {
    try {
      let regionsToRegister = [...desiredRegions];

      // Sort by distance and pick nearest 20
      if (regionsToRegister.length > NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES) {
        if (userLocation) {
          regionsToRegister.sort(
            (a, b) =>
              getDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
              getDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          );
        } else {
          // Alphabetical fallback (deterministic, not random)
          regionsToRegister.sort((a, b) => {
            const nameA = storeCache.get(a.identifier || '')?.name || a.identifier || '';
            const nameB = storeCache.get(b.identifier || '')?.name || b.identifier || '';
            return nameA.localeCompare(nameB);
          });
        }
        regionsToRegister = regionsToRegister.slice(0, NOTIFICATION_CONSTANTS.MAX_NATIVE_GEOFENCES);
      }

      const newIds = new Set(
        regionsToRegister.map((r) => r.identifier).filter((id): id is string => id !== undefined)
      );

      // ─── Unchanged optimization: skip if active set hasn't changed ───
      if (setsEqual(newIds, activeRegionIds)) {
        log(`Commit skipped (${reason}): active ${activeRegionIds.size} regions unchanged`);
        return;
      }

      // ─── Empty case: stop geofencing entirely ───
      if (regionsToRegister.length === 0) {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
        if (hasStarted) await Location.stopGeofencingAsync(GEOFENCE_TASK);
        activeRegionIds.clear();
        log(`Commit (${reason}): all regions removed, geofencing stopped`);
        return;
      }

      // ─── Permission check ───
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        log(`Commit blocked (${reason}): background permission not granted`);
        return;
      }

      // ─── Register new region set ───
      // Expo/iOS replaces the entire monitored set when startGeofencingAsync is called,
      // so we simply pass the new list. No need to manually stop first —
      // calling start with a new list atomically replaces the old one.
      await Location.startGeofencingAsync(GEOFENCE_TASK, regionsToRegister);

      const previousCount = activeRegionIds.size;
      activeRegionIds = newIds;

      // ─── Detailed logging ───
      const totalSaved = storeCache.size;
      log(
        `Commit (${reason}): ` +
        `Saved shops: ${totalSaved} | ` +
        `Active geofences: ${previousCount} → ${activeRegionIds.size} | ` +
        `Desired: ${desiredRegions.length}`
      );

      if (userLocation && lastRebalanceCoords) {
        const dist = getDistance(
          userLocation.latitude, userLocation.longitude,
          lastRebalanceCoords.latitude, lastRebalanceCoords.longitude
        );
        log(`Distance from last rebalance: ${dist.toFixed(0)}m`);
      }
    } catch (e) {
      console.error("commitGeofences error:", e);
      log(`Commit error (${reason}): ${e}`);
    }
  },

  getStoreFromCache(id: string): SavedLocation | undefined {
    return storeCache.get(id);
  },
};
