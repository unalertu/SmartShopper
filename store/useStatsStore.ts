import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface StatsStoreState {
  lifetimeRemindersSent: number;
  lifetimeTripsAssisted: number;
  lifetimeStoresVisited: number;
  isShoppingSessionActive: boolean;
  lastVisitByStore: Record<string, string>; // storeId -> YYYY-MM-DD
  
  incrementRemindersSent: () => void;
  startShoppingSession: () => void;
  recordTripAssisted: () => void;
  recordStoreVisit: (storeId: string) => void;
}

export const useStatsStore = create<StatsStoreState>()(
  persist(
    (set, get) => ({
      lifetimeRemindersSent: 0,
      lifetimeTripsAssisted: 0,
      lifetimeStoresVisited: 0,
      isShoppingSessionActive: false,
      lastVisitByStore: {},

      incrementRemindersSent: () =>
        set((state) => ({ lifetimeRemindersSent: state.lifetimeRemindersSent + 1 })),

      startShoppingSession: () => 
        set({ isShoppingSessionActive: true }),

      recordTripAssisted: () =>
        set((state) => {
          if (state.isShoppingSessionActive) {
            return {
              lifetimeTripsAssisted: state.lifetimeTripsAssisted + 1,
              isShoppingSessionActive: false,
            };
          }
          return state;
        }),
        
      recordStoreVisit: (storeId: string) =>
        set((state) => {
          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          
          if (state.lastVisitByStore[storeId] !== today) {
            return {
              lifetimeStoresVisited: state.lifetimeStoresVisited + 1,
              lastVisitByStore: { ...state.lastVisitByStore, [storeId]: today },
            };
          }
          return state;
        }),
    }),
    {
      name: "stats-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
