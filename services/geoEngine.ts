import AsyncStorage from "@react-native-async-storage/async-storage";
import { SavedLocation } from "../store/useLocationStore";
import { ShoppingItem } from "../store/useShoppingListStore";
import { getDistance } from "./locationService";
import { GEOFENCE_DEFAULT_RADIUS } from "../constants";

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
   * Supports both saved locations and unsaved markets (if savedStoresOnly is false).
   */
  getNearbyStores: async (
    lat: number,
    lon: number,
    savedStoresOnly: boolean,
    searchRadius?: number
  ): Promise<(SavedLocation & { distance: number })[]> => {
    const locations = await geoEngine.getLocations();
    const activeLocations = locations.filter((loc: SavedLocation) => loc.isActive);

    let allCandidates = [...activeLocations];

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
          radius: GEOFENCE_DEFAULT_RADIUS,
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
      .filter((loc) => loc.distance <= (searchRadius || loc.radius || 500));

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
