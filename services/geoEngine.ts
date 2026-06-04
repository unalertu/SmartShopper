import AsyncStorage from "@react-native-async-storage/async-storage";
import { SavedLocation } from "../store/useLocationStore";
import { ShoppingItem } from "../store/useShoppingListStore";
import { getDistance } from "./locationService";

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
   * Get nearby stores sorted by distance (closest first).
   * Returns only active locations within their geofence radius.
   */
  getNearbyStores: async (lat: number, lon: number): Promise<(SavedLocation & { distance: number })[]> => {
    const locations = await geoEngine.getLocations();
    const activeLocations = locations.filter((loc: SavedLocation) => loc.isActive);
    
    const nearbyWithDistance = activeLocations
      .map((loc: SavedLocation) => {
        const distance = getDistance(lat, lon, loc.latitude, loc.longitude);
        return { ...loc, distance };
      })
      .filter((loc) => loc.distance <= loc.radius);

    // Sort by distance (closest first) for tier-aware prioritization
    nearbyWithDistance.sort((a, b) => a.distance - b.distance);

    return nearbyWithDistance;
  }
};
