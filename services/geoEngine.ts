import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedLocation } from "../store/useLocationStore";
import type { ShoppingItem } from "../store/useShoppingListStore";
import { getDistance } from "./locationUtils";

export const geoEngine = {
  getLocations: async (): Promise<SavedLocation[]> => {
    try {
      const data = await AsyncStorage.getItem("location-storage");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed?.state?.locations || [];
      }
    } catch (e) {
      console.error("geoEngine getLocations error", e);
    }
    return [];
  },

  getCachedMarkets: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem("location-storage");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed?.state?.cachedMarkets || [];
      }
    } catch (e) {
      console.error("geoEngine getCachedMarkets error", e);
    }
    return [];
  },

  getMutedUnsavedShops: async (): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem("location-storage");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed?.state?.mutedUnsavedShops || [];
      }
    } catch (e) {
      console.error("geoEngine getMutedUnsavedShops error", e);
    }
    return [];
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

    if (!excludeSaved) {
      const locations = await geoEngine.getLocations();
      const activeLocations = locations.filter((loc: SavedLocation) => loc.isActive);
      allCandidates = [...activeLocations];
    }

    if (!savedStoresOnly) {
      const cachedMarkets = await geoEngine.getCachedMarkets();
      const mutedUnsavedShops = await geoEngine.getMutedUnsavedShops();

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
