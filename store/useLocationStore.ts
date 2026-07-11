import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMaxSavedStores, FREE_TIER, PRO_TIER } from "../constants/tierConfig";
import { geofenceManager } from "../services/geofenceManager";
import { NOTIFICATION_CONSTANTS, getAlertDistanceMeters } from "../constants";
import { useSettingsStore } from "./useSettingsStore";

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: number;
}

interface LocationStoreState {
  locations: SavedLocation[];
  addLocation: (location: Omit<SavedLocation, "id" | "createdAt" | "isActive">) => void;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, updates: Partial<SavedLocation>) => void;
  toggleActive: (id: string) => void;
  getActiveLocations: () => SavedLocation[];
  mutedUnsavedShops: string[];
  toggleMuteUnsavedShop: (id: string) => void;

  /**
   * Check if the user can add a new saved store.
   * Free users: max 3 stores. Pro users: max 20 stores.
   */
  canAddLocation: (isPro: boolean) => boolean;

  /**
   * Returns the current number of saved stores.
   */
  getSavedStoreCount: () => number;

  /**
   * Check if the user can mute another shop.
   */
  canMuteShop: (isPro: boolean) => boolean;

  /**
   * Returns the current number of muted shops (saved and unsaved).
   */
  getMutedShopCount: () => number;

  cachedMarkets: any[];
  setCachedMarkets: (markets: any[]) => void;
  appendCachedMarkets: (markets: any[]) => void;
  
  isFetchingMarkets: boolean;
  fetchingRegionCenter: { latitude: number, longitude: number } | null;
  setIsFetchingMarkets: (isFetching: boolean, center?: { latitude: number, longitude: number } | null) => void;

  // Last store fetch failed at the connectivity level (device offline),
  // as opposed to a server/HTTP failure. Drives the "No connection" UI.
  // Not persisted — connectivity state is meaningless across launches.
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  
  userLocation: { latitude: number, longitude: number } | null;
  setUserLocation: (location: { latitude: number, longitude: number } | null) => void;

  lastBackgroundFetchCoords: { latitude: number, longitude: number } | null;
  setLastBackgroundFetchCoords: (coords: { latitude: number, longitude: number } | null) => void;
}

const generateId = () =>
  `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * The market cache lives under its own AsyncStorage key, written only when
 * the cache actually changes (Overpass fetches). Keeping it out of the
 * store's persist partialize means unrelated sets (user location, offline
 * flag, debug state) never re-serialize up to 5000 markets, and the
 * background pipeline (geoEngine) can read it after a headless relaunch.
 *
 * Two lists, two rules:
 * - Disk (this key) is the durable superset: MAX_CACHED_MARKETS / CACHE_TTL_MS.
 *   Writes MERGE into it — the map's viewport-trimmed working set must never
 *   shrink it. Only an intentional clear (setCachedMarkets([])) overwrites.
 * - In-memory `cachedMarkets` is the map's working set, capped at
 *   MARKET_WORKING_SET_CAP by the map's own trimming and by hydration below.
 */
export const MARKET_CACHE_STORAGE_KEY = "market-cache-storage";

// Dedup (existing entries win), stamp lastSeenAt on new ones, then apply the
// durable cache rules: TTL expiry and newest-first LRU cap. Same semantics
// appendCachedMarkets has always had.
const mergeMarketLists = (existing: any[], incoming: any[]): any[] => {
  const now = Date.now();
  const existingIds = new Set(existing.map((m: any) => m.id));
  const newUnique = incoming
    .filter((m: any) => !existingIds.has(m.id))
    .map((m: any) => (m.lastSeenAt ? m : { ...m, lastSeenAt: now }));

  let merged = [...existing, ...newUnique];
  merged = merged.filter((m: any) => {
    if (!m.lastSeenAt) return true; // keep legacy ones or default to true
    return now - m.lastSeenAt < NOTIFICATION_CONSTANTS.CACHE_TTL_MS;
  });
  if (merged.length > NOTIFICATION_CONSTANTS.MAX_CACHED_MARKETS) {
    merged.sort((a: any, b: any) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
    merged = merged.slice(0, NOTIFICATION_CONSTANTS.MAX_CACHED_MARKETS);
  }
  return merged;
};

const readDiskMarketCache = async (): Promise<any[]> => {
  try {
    const data = await AsyncStorage.getItem(MARKET_CACHE_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("readDiskMarketCache error", e);
  }
  return [];
};

// Writes are chained so concurrent read-merge-write cycles (background fetch
// racing a map fetch) can't lose each other's markets.
let marketCachePersistChain: Promise<void> = Promise.resolve();
// Set on the first explicit cache write of this session; hydration backs off
// once anything (fetch or clear) has touched the cache.
let marketCacheTouched = false;

const persistMarketCache = (markets: any[], mode: 'merge' | 'overwrite') => {
  marketCacheTouched = true;
  marketCachePersistChain = marketCachePersistChain.then(async () => {
    try {
      const toWrite = mode === 'merge'
        ? mergeMarketLists(await readDiskMarketCache(), markets)
        : markets;
      await AsyncStorage.setItem(MARKET_CACHE_STORAGE_KEY, JSON.stringify(toWrite));
    } catch (e) {
      console.warn("persistMarketCache error", e);
    }
  });
};

export const useLocationStore = create<LocationStoreState>()(
  persist(
    (set, get) => ({
      locations: [],
      mutedUnsavedShops: [],
      cachedMarkets: [],
      isFetchingMarkets: false,
      fetchingRegionCenter: null,
      isOffline: false,
      userLocation: null,
      lastBackgroundFetchCoords: null,
      
      setCachedMarkets: (markets) => {
        // The map replaces the in-memory working set (viewport-trimmed), but
        // the disk cache only ever grows via merge. An empty set is the
        // intentional "clear cache" action and wipes the disk copy too.
        persistMarketCache(markets, markets.length === 0 ? 'overwrite' : 'merge');
        set({ cachedMarkets: markets });
      },
      appendCachedMarkets: (markets) => set((state) => {
        const updatedMarkets = mergeMarketLists(state.cachedMarkets, markets);
        persistMarketCache(updatedMarkets, 'merge');
        return { cachedMarkets: updatedMarkets };
      }),
      setIsFetchingMarkets: (isFetching, center = null) => set({
        isFetchingMarkets: isFetching,
        fetchingRegionCenter: isFetching ? center : null
      }),
      setIsOffline: (offline) => set((state) =>
        state.isOffline === offline ? state : { isOffline: offline }
      ),
      setUserLocation: (location) => set({ userLocation: location }),
      setLastBackgroundFetchCoords: (coords) => set({ lastBackgroundFetchCoords: coords }),

      addLocation: (location) =>
        set((state) => {
          const newLoc = {
            ...location,
            id: generateId(),
            isActive: true,
            createdAt: Date.now(),
          };
          const sensitivity = useSettingsStore.getState().notificationSensitivity;
          const alertDistance = getAlertDistanceMeters(sensitivity);
          void geofenceManager.registerSavedStore(newLoc, alertDistance);
          return {
            locations: [newLoc, ...state.locations],
          };
        }),

      removeLocation: (id) =>
        set((state) => {
          void geofenceManager.unregisterSavedStore(id);
          return {
            locations: state.locations.filter((loc) => loc.id !== id),
          };
        }),

      updateLocation: (id, updates) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id ? { ...loc, ...updates } : loc
          ),
        })),

      toggleActive: (id) =>
        set((state) => {
          const updated = state.locations.map((loc) =>
            loc.id === id ? { ...loc, isActive: !loc.isActive } : loc
          );
          const toggled = updated.find(loc => loc.id === id);
          if (toggled) {
            if (toggled.isActive) {
              const sensitivity = useSettingsStore.getState().notificationSensitivity;
              const alertDistance = getAlertDistanceMeters(sensitivity);
              void geofenceManager.registerSavedStore(toggled, alertDistance);
            } else {
              void geofenceManager.unregisterSavedStore(id);
            }
          }
          return { locations: updated };
        }),

      getActiveLocations: () =>
        get().locations.filter((loc) => loc.isActive),

      toggleMuteUnsavedShop: (id) =>
        set((state) => {
          const isMuted = state.mutedUnsavedShops.includes(id);
          return {
            mutedUnsavedShops: isMuted
              ? state.mutedUnsavedShops.filter((mId) => mId !== id)
              : [...state.mutedUnsavedShops, id],
          };
        }),

      canAddLocation: (isPro: boolean) => {
        const currentCount = get().locations.length;
        const max = getMaxSavedStores(isPro);
        return currentCount < max;
      },

      getSavedStoreCount: () => get().locations.length,

      canMuteShop: (isPro: boolean) => {
        const currentCount = get().getMutedShopCount();
        const max = isPro ? PRO_TIER.maxMutedShops : FREE_TIER.maxMutedShops;
        return currentCount < max;
      },

      getMutedShopCount: () => {
        const state = get();
        const mutedSaved = state.locations.filter((loc) => !loc.isActive).length;
        const mutedUnsaved = state.mutedUnsavedShops.length;
        return mutedSaved + mutedUnsaved;
      },
    }),
    {
      name: "location-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locations: state.locations,
        mutedUnsavedShops: state.mutedUnsavedShops,
        lastBackgroundFetchCoords: state.lastBackgroundFetchCoords,
      }),
    }
  )
);

/**
 * Cold-start hydration of the in-memory working set from the disk cache.
 * Bounded to MARKET_WORKING_SET_CAP — the map builds its cluster tree from
 * this list, so the full 5000-market disk cache must never land here. Picks
 * the markets nearest to the best-known position (last background fetch,
 * else first active saved store), falling back to most-recently-seen.
 * Backs off if any fetch or clear touched the cache first; readers that need
 * the full cache (geoEngine) union memory with disk themselves.
 */
const hydrateMarketCache = async () => {
  try {
    const disk = await readDiskMarketCache();
    if (disk.length === 0) return;

    const now = Date.now();
    const fresh = disk.filter((m: any) => {
      if (!m.lastSeenAt) return true;
      return now - m.lastSeenAt < NOTIFICATION_CONSTANTS.CACHE_TTL_MS;
    });
    if (fresh.length === 0) return;

    if (marketCacheTouched || useLocationStore.getState().cachedMarkets.length > 0) return;

    const state = useLocationStore.getState();
    const ref = state.lastBackgroundFetchCoords
      ?? state.locations.find((l) => l.isActive)
      ?? null;

    let workingSet = fresh;
    const cap = NOTIFICATION_CONSTANTS.MARKET_WORKING_SET_CAP;
    if (workingSet.length > cap) {
      if (ref) {
        const cosLat = Math.cos((ref.latitude * Math.PI) / 180);
        const distSq = (m: any) => {
          const dLat = m.latitude - ref.latitude;
          const dLon = (m.longitude - ref.longitude) * cosLat;
          return dLat * dLat + dLon * dLon;
        };
        const keepIds = new Set(
          [...workingSet].sort((a, b) => distSq(a) - distSq(b)).slice(0, cap).map((m: any) => m.id)
        );
        workingSet = workingSet.filter((m: any) => keepIds.has(m.id));
      } else {
        workingSet = [...workingSet]
          .sort((a: any, b: any) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
          .slice(0, cap);
      }
    }

    // A fetch or clear may have landed while disk was being read
    if (marketCacheTouched || useLocationStore.getState().cachedMarkets.length > 0) return;
    useLocationStore.setState({ cachedMarkets: workingSet });
  } catch (e) {
    console.warn("hydrateMarketCache error", e);
  }
};

// lastBackgroundFetchCoords and saved locations arrive with persist
// rehydration, so hydrate after it completes.
if (useLocationStore.persist.hasHydrated()) {
  void hydrateMarketCache();
} else {
  const unsubHydration = useLocationStore.persist.onFinishHydration(() => {
    unsubHydration();
    void hydrateMarketCache();
  });
}
