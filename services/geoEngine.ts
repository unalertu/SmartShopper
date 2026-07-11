import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedLocation } from "../store/useLocationStore";
import type { ShoppingItem } from "../store/useShoppingListStore";
import { getDistance } from "./locationUtils";
import { NOTIFICATION_CONSTANTS } from "../constants";

// Single read+parse of the persisted location store, shared by the getters
// below so one background wake-up doesn't parse the same blob three times.
const readLocationStorageState = async (): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem("location-storage");
    if (data) {
      return JSON.parse(data)?.state ?? null;
    }
  } catch (e) {
    console.error("geoEngine readLocationStorageState error", e);
  }
  return null;
};

// Union of the in-memory working set and the durable disk cache. Memory is
// the map's viewport-trimmed subset (and holds fetches whose merge-write
// hasn't landed yet); disk is the merged superset that survives headless
// relaunches. Neither alone is complete, so the pipeline reads both.
// Disk entries past their TTL are dropped on read — the durable cache is
// only rewritten on fetches, which may be rare. NOT part of location-storage;
// see MARKET_CACHE_STORAGE_KEY in useLocationStore.
const readCachedMarkets = async (): Promise<any[]> => {
  try {
    // Lazy require: useLocationStore -> geofenceManager -> geoEngine would
    // otherwise form an import cycle.
    const { useLocationStore, MARKET_CACHE_STORAGE_KEY } = require("../store/useLocationStore");
    const inMemory: any[] = useLocationStore.getState().cachedMarkets ?? [];

    let onDisk: any[] = [];
    const data = await AsyncStorage.getItem(MARKET_CACHE_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        onDisk = parsed.filter((m: any) => {
          if (!m.lastSeenAt) return true;
          return now - m.lastSeenAt < NOTIFICATION_CONSTANTS.CACHE_TTL_MS;
        });
      }
    }

    if (onDisk.length === 0) return inMemory;
    if (inMemory.length === 0) return onDisk;
    const inMemoryIds = new Set(inMemory.map((m: any) => m.id));
    return [...inMemory, ...onDisk.filter((m: any) => !inMemoryIds.has(m.id))];
  } catch (e) {
    console.error("geoEngine readCachedMarkets error", e);
  }
  return [];
};

export const geoEngine = {
  getLocations: async (): Promise<SavedLocation[]> => {
    const state = await readLocationStorageState();
    return state?.locations || [];
  },

  getCachedMarkets: async (): Promise<any[]> => {
    return readCachedMarkets();
  },

  getMutedUnsavedShops: async (): Promise<string[]> => {
    const state = await readLocationStorageState();
    return state?.mutedUnsavedShops || [];
  },

  hasUnpurchasedItems: async (): Promise<boolean> => {
    try {
      const data = await AsyncStorage.getItem("shopping-list-storage");
      if (data) {
        const parsed = JSON.parse(data);
        const items: ShoppingItem[] = parsed?.state?.items || [];
        return items.some((item: ShoppingItem) => !item.isPurchased);
      }
    } catch (e) {
      console.error("geoEngine hasUnpurchasedItems error", e);
    }
    return false;
  },

  /**
   * The "active" shopping list: the most recently updated list that still
   * has unpurchased items, together with those items. Used by location
   * notifications for both the body text and the deep-link payload.
   */
  getActiveShoppingList: async (): Promise<{
    listId: number;
    listName: string;
    items: { name: string }[];
  } | null> => {
    try {
      const listsData = await AsyncStorage.getItem("lists-storage");
      const itemsData = await AsyncStorage.getItem("shopping-list-storage");

      if (listsData && itemsData) {
        const parsedLists = JSON.parse(listsData);
        const parsedItems = JSON.parse(itemsData);

        const lists = parsedLists?.state?.lists || [];
        const items: ShoppingItem[] = parsedItems?.state?.items || [];

        // Group unpurchased items by listId
        const unpurchasedItemsByList: Record<number, ShoppingItem[]> = {};
        items.forEach((item) => {
          if (!item.isPurchased) {
            if (!unpurchasedItemsByList[item.listId]) {
              unpurchasedItemsByList[item.listId] = [];
            }
            unpurchasedItemsByList[item.listId].push(item);
          }
        });

        // Only consider lists that have unpurchased items
        const validLists = lists.filter((list: any) => unpurchasedItemsByList[list.id]?.length > 0);

        if (validLists.length === 0) {
          return null;
        }

        // Sort lists by:
        // 1. Most recently updated (updatedAt or createdAt) - Descending
        // 2. Unpurchased item count - Descending
        validLists.sort((a: any, b: any) => {
          const aUpdated = a.updatedAt || a.createdAt || 0;
          const bUpdated = b.updatedAt || b.createdAt || 0;
          if (aUpdated !== bUpdated) {
            return bUpdated - aUpdated;
          }
          const aCount = unpurchasedItemsByList[a.id].length;
          const bCount = unpurchasedItemsByList[b.id].length;
          return bCount - aCount;
        });

        const bestList = validLists[0];
        return {
          listId: bestList.id,
          listName: bestList.name,
          items: unpurchasedItemsByList[bestList.id].map((item) => ({ name: item.name })),
        };
      }
    } catch (e) {
      console.error("geoEngine getActiveShoppingList error", e);
    }
    return null;
  },

  getUnpurchasedItems: async (): Promise<{ name: string }[]> => {
    const activeList = await geoEngine.getActiveShoppingList();
    return activeList?.items ?? [];
  },

  getUnpurchasedItemCount: async (): Promise<number> => {
    const items = await geoEngine.getUnpurchasedItems();
    return items.length;
  },

  hasActiveShoppingList: async (): Promise<boolean> => {
    try {
      // Must have at least one list
      const listData = await AsyncStorage.getItem("lists-storage");
      if (!listData) return false;
      const parsedLists = JSON.parse(listData);
      const lists = parsedLists?.state?.lists || [];
      if (lists.length === 0) return false;

      // Must have at least one unpurchased item
      return await geoEngine.hasUnpurchasedItems();
    } catch (e) {
      console.error("geoEngine hasActiveShoppingList error", e);
      return false;
    }
  },

  /**
   * Get nearby stores sorted by distance (closest first).
   * Supports both saved locations and unsaved markets.
   * If excludeSaved is true, it only returns unsaved cached markets.
   * 
   * @param alertDistance - The global Alert Distance in meters, derived from notificationSensitivity
   */
  getNearbyStores: async (
    lat: number,
    lon: number,
    savedStoresOnly: boolean,
    alertDistance: number,
    excludeSaved?: boolean
  ): Promise<(SavedLocation & { distance: number })[]> => {
    let allCandidates: SavedLocation[] = [];
    const storageState = await readLocationStorageState();

    if (!excludeSaved) {
      const locations: SavedLocation[] = storageState?.locations || [];
      const activeLocations = locations.filter((loc: SavedLocation) => loc.isActive);
      allCandidates = [...activeLocations];
    }

    if (!savedStoresOnly) {
      const cachedMarkets = await readCachedMarkets();
      const mutedUnsavedShops: string[] = storageState?.mutedUnsavedShops || [];

      const activeUnsaved = cachedMarkets
        .filter((market: any) => !mutedUnsavedShops.includes(market.id))
        .map((market: any) => ({
          id: market.id,
          name: market.name,
          latitude: market.latitude,
          longitude: market.longitude,
          isActive: true,
          isUnsaved: true // Flag to identify unsaved locations
        } as unknown as SavedLocation));
      
      allCandidates = [...allCandidates, ...activeUnsaved];
    }
    
    const nearbyWithDistance = allCandidates
      .map((loc: SavedLocation) => {
        const distance = getDistance(lat, lon, loc.latitude, loc.longitude);
        return { ...loc, distance };
      })
      .filter((loc) => loc.distance <= alertDistance);

    // Sort by distance (closest first)
    nearbyWithDistance.sort((a, b) => a.distance - b.distance);

    return nearbyWithDistance;
  },

  getBoundingBox: (lat: number, lon: number, radiusInMeters: number) => {
    // 1 degree of latitude is ~111,320 meters
    const latOffset = radiusInMeters / 111320;
    // 1 degree of longitude is ~111,320 meters * cos(latitude)
    const lonOffset = radiusInMeters / (111320 * Math.cos((lat * Math.PI) / 180));
    return {
      south: lat - latOffset,
      north: lat + latOffset,
      west: lon - lonOffset,
      east: lon + lonOffset,
    };
  }
};
