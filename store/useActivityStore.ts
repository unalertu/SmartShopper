import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivityEventType =
  | 'list_created'
  | 'list_removed'
  | 'item_added'
  | 'item_removed'
  | 'item_completed'
  | 'purchased_cleared'
  | 'list_cleared';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle: string;
  timestamp: number;
  listId?: number;
}

interface ActivityStoreState {
  activities: ActivityEvent[];
  logActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStoreState>()(
  persist(
    (set) => ({
      activities: [],

      logActivity: (event) =>
        set((state) => {
          const newEvent: ActivityEvent = {
            ...event,
            id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
          };
          
          // Keep only the last 50 activities to avoid bloat
          const newActivities = [newEvent, ...state.activities].slice(0, 50);
          
          return { activities: newActivities };
        }),

      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: "activity-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
