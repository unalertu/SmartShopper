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
  
  userLocation: { latitude: number, longitude: number } | null;
  setUserLocation: (location: { latitude: number, longitude: number } | null) => void;

  lastBackgroundFetchCoords: { latitude: number, longitude: number } | null;
  setLastBackgroundFetchCoords: (coords: { latitude: number, longitude: number } | null) => void;

  debugMetrics: {
    backgroundExecutions: number;
    overpassRequests: number;
    notificationsTriggered: number;
    fetchThrottled: boolean;
    consecutiveHighSpeedCount: number;
  };
  incrementDebugMetric: (key: keyof LocationStoreState['debugMetrics']) => void;
  setDebugMetric: <K extends keyof LocationStoreState['debugMetrics']>(key: K, value: LocationStoreState['debugMetrics'][K]) => void;

  debugLogs: string[];
  addDebugLog: (msg: string) => void;
  clearDebugLogs: () => void;
}

const generateId = () =>
  `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useLocationStore = create<LocationStoreState>()(
  persist(
    (set, get) => ({
      locations: [],
      mutedUnsavedShops: [],
      cachedMarkets: [],
      isFetchingMarkets: false,
      fetchingRegionCenter: null,
      userLocation: null,
      lastBackgroundFetchCoords: null,
      
      debugMetrics: {
        backgroundExecutions: 0,
        overpassRequests: 0,
        notificationsTriggered: 0,
        fetchThrottled: false,
        consecutiveHighSpeedCount: 0,
      },
      debugLogs: [],

      setCachedMarkets: (markets) => set({ cachedMarkets: markets }),
      appendCachedMarkets: (markets) => set((state) => {
        const now = Date.now();
        // deduplicate by ID and add lastSeenAt
        const existingIds = new Set(state.cachedMarkets.map(m => m.id));
        const newUnique = markets
          .filter(m => !existingIds.has(m.id))
          .map(m => ({ ...m, lastSeenAt: now }));
          
        let updatedMarkets = [...state.cachedMarkets, ...newUnique];
        
        // Cleanup cache
        // 1. TTL: remove markets older than CACHE_TTL_MS
        updatedMarkets = updatedMarkets.filter(m => {
           if (!m.lastSeenAt) return true; // keep legacy ones or default to true
           return (now - m.lastSeenAt) < NOTIFICATION_CONSTANTS.CACHE_TTL_MS;
        });

        // 2. LRU: keep max MAX_CACHED_MARKETS
        if (updatedMarkets.length > NOTIFICATION_CONSTANTS.MAX_CACHED_MARKETS) {
           updatedMarkets.sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
           updatedMarkets = updatedMarkets.slice(0, NOTIFICATION_CONSTANTS.MAX_CACHED_MARKETS);
        }

        return { cachedMarkets: updatedMarkets };
      }),
      setIsFetchingMarkets: (isFetching, center = null) => set({ 
        isFetchingMarkets: isFetching,
        fetchingRegionCenter: isFetching ? center : null
      }),
      setUserLocation: (location) => set({ userLocation: location }),
      setLastBackgroundFetchCoords: (coords) => set({ lastBackgroundFetchCoords: coords }),

      incrementDebugMetric: (key) => set((state) => ({
        debugMetrics: {
          ...state.debugMetrics,
          [key]: (state.debugMetrics[key] as number) + 1
        }
      })),
      setDebugMetric: (key, value) => set((state) => ({
        debugMetrics: {
          ...state.debugMetrics,
          [key]: value
        }
      })),

      addDebugLog: (msg) => set((state) => {
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const entry = `[${timestamp}] ${msg}`;
        const newLogs = [entry, ...state.debugLogs].slice(0, 100);
        return { debugLogs: newLogs };
      }),
      clearDebugLogs: () => set({ debugLogs: [] }),

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
