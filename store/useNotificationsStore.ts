import { create } from "zustand";
import { notificationAnalytics } from "../services/notificationAnalytics";

export interface AppNotification {
  id: string;
  type: 'location' | 'welcome';
  title: string;
  body: string;
  storeId?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsStoreState {
  notifications: AppNotification[];
  syncFromAnalytics: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  unreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsStoreState>((set, get) => ({
  notifications: [],

  syncFromAnalytics: async () => {
    const history = await notificationAnalytics.getHistory();
    set({ notifications: history as AppNotification[] });
  },

  removeNotification: async (id) => {
    // 1. Update analytics service
    await notificationAnalytics.removeNotification(id);
    // 2. Update local state
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  markAsRead: async (id) => {
    await notificationAnalytics.markAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: async () => {
    await notificationAnalytics.markAllAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: async () => {
    await notificationAnalytics.clearHistory();
    set({ notifications: [] });
  },

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
