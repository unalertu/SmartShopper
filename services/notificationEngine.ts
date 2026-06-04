import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLocalNotification } from "./notificationService";
import { AppNotification } from "../store/useNotificationsStore";
import { getMaxNotificationsPerDay } from "../constants/tierConfig";

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Returns today's date key for daily counter tracking (YYYY-MM-DD).
 */
const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

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

  // ── Daily notification counter ──────────────────────────────────────────────

  /**
   * Get today's total notification count.
   */
  getTodaysNotificationCount: async (): Promise<number> => {
    try {
      const key = `daily_notif_count_${getTodayKey()}`;
      const countStr = await AsyncStorage.getItem(key);
      return countStr ? parseInt(countStr, 10) : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Increment today's notification counter.
   */
  incrementDailyNotificationCount: async (): Promise<void> => {
    try {
      const key = `daily_notif_count_${getTodayKey()}`;
      const current = await notificationEngine.getTodaysNotificationCount();
      await AsyncStorage.setItem(key, (current + 1).toString());
    } catch (e) {
      console.error("notificationEngine incrementDailyNotificationCount error", e);
    }
  },

  /**
   * Check if we can send a notification based on daily limits.
   * Pro users have no daily cap.
   */
  canSendDailyNotification: async (isPro: boolean): Promise<boolean> => {
    if (isPro) return true;
    const count = await notificationEngine.getTodaysNotificationCount();
    const max = getMaxNotificationsPerDay(isPro);
    return count < max;
  },

  // ── Daily nearby alert counter ──────────────────────────────────────────────

  /**
   * Get today's nearby-store alert count.
   */
  getTodaysNearbyAlertCount: async (): Promise<number> => {
    try {
      const key = `daily_nearby_count_${getTodayKey()}`;
      const countStr = await AsyncStorage.getItem(key);
      return countStr ? parseInt(countStr, 10) : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Increment today's nearby-store alert counter.
   */
  incrementDailyNearbyAlertCount: async (): Promise<void> => {
    try {
      const key = `daily_nearby_count_${getTodayKey()}`;
      const current = await notificationEngine.getTodaysNearbyAlertCount();
      await AsyncStorage.setItem(key, (current + 1).toString());
    } catch (e) {
      console.error("notificationEngine incrementDailyNearbyAlertCount error", e);
    }
  },

  /**
   * Check if we can send a nearby-store alert based on daily limits.
   * Pro users have no daily cap.
   */
  canSendNearbyAlert: async (isPro: boolean): Promise<boolean> => {
    if (isPro) return true;
    const count = await notificationEngine.getTodaysNearbyAlertCount();
    return count < 5; // FREE_TIER.maxNearbyAlertsPerDay
  },

  // ── Core dispatch ───────────────────────────────────────────────────────────

  /**
   * Dispatch a local notification with tier-aware daily limits.
   * 
   * For free users: if the daily limit is reached, the notification is
   * silently skipped — NOT logged to user-facing history.
   * For Pro users: always dispatches.
   */
  dispatchLocalNotification: async (
    title: string,
    body: string,
    type: AppNotification['type'],
    isPro: boolean = false
  ) => {
    // Check daily notification limit
    const canSend = await notificationEngine.canSendDailyNotification(isPro);
    if (!canSend) {
      // Silently skip — do NOT log to history
      return;
    }

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

    // 3. Increment daily counter
    await notificationEngine.incrementDailyNotificationCount();
  },

  /**
   * Dispatch a nearby-store alert with tier-aware limits.
   * This also counts against the daily notification limit.
   * 
   * For free users: checks both nearby alert limit AND daily notification limit.
   * For Pro users: always dispatches.
   */
  dispatchNearbyAlert: async (
    title: string,
    body: string,
    isPro: boolean = false
  ) => {
    // Check nearby alert limit
    const canSendNearby = await notificationEngine.canSendNearbyAlert(isPro);
    if (!canSendNearby) return;

    // Check general daily notification limit
    const canSendDaily = await notificationEngine.canSendDailyNotification(isPro);
    if (!canSendDaily) return;

    // 1. Fire system notification
    await sendLocalNotification(title, body);

    // 2. Save to history
    await notificationEngine.addNotification({
      title,
      body,
      type: "store_nearby",
      time: "Just now",
      read: false,
    });

    // 3. Increment both counters
    await notificationEngine.incrementDailyNotificationCount();
    await notificationEngine.incrementDailyNearbyAlertCount();
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
