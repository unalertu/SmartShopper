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

  getNearbyStores: async (lat: number, lon: number): Promise<SavedLocation[]> => {
    const locations = await geoEngine.getLocations();
    const activeLocations = locations.filter((loc: SavedLocation) => loc.isActive);
    
    return activeLocations.filter((loc: SavedLocation) => {
      const distance = getDistance(lat, lon, loc.latitude, loc.longitude);
      return distance <= loc.radius;
    });
  }
};
