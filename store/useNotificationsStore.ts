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

const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'store_nearby',
    title: 'You\'re near Migros',
    body: 'You have 3 items on your "Weekly Groceries" list. Don\'t forget to shop!',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'list_reminder',
    title: 'List Reminder',
    body: 'Your "Essentials" list hasn\'t been updated in 5 days.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: '3',
    type: 'location_permission',
    title: 'Enable Location Services',
    body: 'SmartShopper needs location access to alert you when you\'re near your saved stores.',
    time: '3 hrs ago',
    read: false,
  },
  {
    id: '4',
    type: 'welcome',
    title: 'Welcome to SmartShopper!',
    body: 'Start by creating your first shopping list and saving your favorite stores.',
    time: 'Yesterday',
    read: true,
  },
];

interface NotificationsStoreState {
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsStoreState>()(
  persist(
    (set, get) => ({
      notifications: SAMPLE_NOTIFICATIONS,
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
      name: "notifications-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
