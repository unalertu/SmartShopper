import { notificationAnalytics } from "./notificationAnalytics";
import { SavedLocation } from "../store/useLocationStore";

export const notificationEngine = {
  /**
   * Core decision: Should we send a location notification?
   */
  shouldSendLocationNotification: async (params: {
    storeId: string;
    isPro: boolean;
    nightNotificationsEnabled: boolean;
  }): Promise<{ allowed: boolean; reason?: string }> => {
    // TEST MODE: Bypass all restrictions
    console.log(`[TEST] Bypassing restrictions for store: ${params.storeId}`);
    return { allowed: true };
  },

  /**
   * Pick the best store from a list of candidates.
   */
  pickBestStore: async (
    nearbyStores: (SavedLocation & { distance: number })[]
  ): Promise<(SavedLocation & { distance: number }) | null> => {
    if (nearbyStores.length === 0) return null;

    // TEST MODE: Bypass store cooldown checks
    console.log(`[TEST] Picking best store from: ${nearbyStores.map(s => s.name).join(", ")}`);
    return nearbyStores[0];
  },

  buildNotificationContent: (storeName: string): { title: string; body: string } => {
    return {
      title: "You're Near a Saved Store",
      body: `You still have items waiting on your shopping list.`,
    };
  },

  generateFingerprint: (storeId: string): string => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return `location:${storeId}:${today}`;
  },

  isInQuietHours: (nightNotificationsEnabled: boolean): boolean => {
    if (nightNotificationsEnabled) return false;
    const hour = new Date().getHours();
    return hour >= 22 || hour < 8;
  },

  isUserLikelyWalking: (speedMs: number | null): boolean => {
    if (speedMs === null || speedMs === undefined) return true; // unknown speed -> assume walking
    return speedMs < 6.94; // 25 km/h limit
  },

  checkAndSendWelcome: async (): Promise<void> => {
    const state = await notificationAnalytics.getState();
    if (!state.hasSentWelcome) {
      await notificationAnalytics.addWelcomeNotification(
        "Welcome to SmartShopper",
        "Start creating your smart shopping lists today."
      );
    }
  },
};
