import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMaxSavedStores, FREE_TIER, PRO_TIER } from "../constants/tierConfig";

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // geofence radius in meters
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
        // deduplicate by ID
        const existingIds = new Set(state.cachedMarkets.map(m => m.id));
        const newUnique = markets.filter(m => !existingIds.has(m.id));
        return { cachedMarkets: [...state.cachedMarkets, ...newUnique] };
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
        set((state) => ({
          locations: [
            {
              ...location,
              id: generateId(),
              isActive: true,
              createdAt: Date.now(),
            },
            ...state.locations,
          ],
        })),

      removeLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter((loc) => loc.id !== id),
        })),

      updateLocation: (id, updates) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id ? { ...loc, ...updates } : loc
          ),
        })),

      toggleActive: (id) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id ? { ...loc, isActive: !loc.isActive } : loc
          ),
        })),

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
    }
  )
);
