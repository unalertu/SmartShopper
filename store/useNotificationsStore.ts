import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppNotification {
  id: string;
  type: 'store_nearby' | 'list_reminder' | 'location_permission' | 'welcome';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface NotificationsStoreState {
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

const dummyNotifications: AppNotification[] = [
  // Nearby Stores (6)
  { id: '1', type: 'store_nearby', title: 'Migros is nearby', body: 'You have 3 items on your Grocery list. The store is 200m away.', time: 'Just now', read: false },
  { id: '2', type: 'store_nearby', title: 'CarrefourSA is nearby', body: 'The store is 120m away. Do you want to check your Electronics list?', time: '2h ago', read: false },
  { id: '3', type: 'store_nearby', title: 'BİM is nearby', body: 'The store is only 50m away.', time: 'Yesterday', read: true },
  { id: '4', type: 'store_nearby', title: 'A101 is nearby', body: 'You are close to the store.', time: '2 days ago', read: true },
  { id: '5', type: 'store_nearby', title: 'ŞOK is nearby', body: 'The store is 180m away.', time: '3 days ago', read: true },
  { id: '6', type: 'store_nearby', title: 'Macrocenter is nearby', body: 'The store is 400m away.', time: '1 week ago', read: true },

  // List Reminders (3)
  { id: '7', type: 'list_reminder', title: 'Weekly Groceries', body: '12 items remaining on your list.', time: '2h ago', read: false },
  { id: '8', type: 'list_reminder', title: 'Weekend BBQ', body: "Don't forget your Weekend BBQ shopping list.", time: 'Yesterday', read: true },
  { id: '9', type: 'list_reminder', title: 'Office Supplies', body: 'This list has 2 pending items.', time: '3 days ago', read: true },

  // System Alerts (3)
  { id: '10', type: 'location_permission', title: 'Location Services', body: 'Enable location to get notified when near stores.', time: 'Yesterday', read: true },
  { id: '11', type: 'location_permission', title: 'Background Location', body: 'Allow background location access to receive store alerts while the app is closed.', time: '5 days ago', read: true },
  { id: '12', type: 'location_permission', title: 'Battery Optimization', body: 'Please disable battery optimization for better location tracking.', time: '1 week ago', read: true },

  // Updates/Welcome (2)
  { id: '13', type: 'welcome', title: 'Welcome to SmartShopper', body: 'Start creating your smart shopping lists today.', time: '1 week ago', read: true },
  { id: '14', type: 'welcome', title: "What's new in v2.0", body: 'SmartShopper v2.0 introduces improved store detection and faster notifications.', time: '2 weeks ago', read: true },
];

export const useNotificationsStore = create<NotificationsStoreState>()(
  persist(
    (set, get) => ({
      notifications: dummyNotifications,
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      clearAll: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: "notifications-storage-v4",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
