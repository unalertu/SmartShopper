import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLocalNotification } from "./notificationService";
import { AppNotification } from "../store/useNotificationsStore";

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const notificationEngine = {
  getNotifications: async (): Promise<AppNotification[]> => {
    try {
      const data = await AsyncStorage.getItem("notifications-storage-v3");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed?.state?.notifications || [];
      }
    } catch (e) {
      console.error("notificationEngine getNotifications error", e);
    }
    return [];
  },

  addNotification: async (notification: Omit<AppNotification, "id">) => {
    try {
      const currentData = await AsyncStorage.getItem("notifications-storage-v3");
      let parsed = currentData ? JSON.parse(currentData) : { state: { notifications: [] }, version: 0 };
      
      const newNotification: AppNotification = {
        ...notification,
        id: generateId(),
      };
      
      if (!parsed.state) parsed.state = { notifications: [] };
      if (!parsed.state.notifications) parsed.state.notifications = [];
      
      parsed.state.notifications.unshift(newNotification);
      
      await AsyncStorage.setItem("notifications-storage-v3", JSON.stringify(parsed));
    } catch (e) {
      console.error("notificationEngine addNotification error", e);
    }
  },

  dispatchLocalNotification: async (title: string, body: string, type: AppNotification['type']) => {
    // 1. Fire system notification
    await sendLocalNotification(title, body);
    
    // 2. Save to history
    await notificationEngine.addNotification({
      title,
      body,
      type,
      time: "Just now",
      read: false,
    });
  },

  canSendStoreNotification: async (storeId: string): Promise<boolean> => {
    try {
      const COOLDOWN_MS = 15 * 60 * 1000; // 15 mins cooldown
      const key = `cooldown_store_${storeId}`;
      const lastSentStr = await AsyncStorage.getItem(key);
      if (lastSentStr) {
        const lastSent = parseInt(lastSentStr, 10);
        if (Date.now() - lastSent < COOLDOWN_MS) {
          return false;
        }
      }
      
      await AsyncStorage.setItem(key, Date.now().toString());
      return true;
    } catch (e) {
      return true;
    }
  },

  checkAndSendWelcome: async () => {
    try {
      const key = "has_shown_welcome";
      const hasShown = await AsyncStorage.getItem(key);
      if (hasShown !== "true") {
        await AsyncStorage.setItem(key, "true");
        await notificationEngine.addNotification({
          title: "Welcome to GeoCart!",
          body: "Start by creating your first shopping list and saving your favorite stores.",
          type: "welcome",
          time: "Just now",
          read: false,
        });
      }
    } catch (e) {
      console.error("notificationEngine checkAndSendWelcome error", e);
    }
  }
};
