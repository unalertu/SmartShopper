import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
}

const generateId = () =>
  `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useLocationStore = create<LocationStoreState>()(
  persist(
    (set, get) => ({
      locations: [],

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
    }),
    {
      name: "location-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
