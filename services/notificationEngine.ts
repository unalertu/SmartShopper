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
    const { storeId, isPro, nightNotificationsEnabled } = params;

    // 1. Quiet hours
    if (notificationEngine.isInQuietHours(nightNotificationsEnabled)) {
      return { allowed: false, reason: "Quiet hours active" };
    }

    const state = await notificationAnalytics.getState();

    // 2. Daily limits (Free tier)
    if (!notificationAnalytics.canSendDailyNotification(state, isPro)) {
      return { allowed: false, reason: "Daily limit reached" };
    }

    // 3. Global cooldown
    if (notificationAnalytics.isGlobalCooldownActive(state)) {
      return { allowed: false, reason: "Global cooldown active" };
    }

    // 4. Store cooldown
    if (notificationAnalytics.isStoreCoolingDown(state, storeId)) {
      return { allowed: false, reason: "Store cooling down" };
    }

    // 5. Fingerprint dedup
    if (notificationAnalytics.hasFingerprint(state, storeId)) {
      return { allowed: false, reason: "Already notified for this store today" };
    }

    return { allowed: true };
  },

  /**
   * Pick the best store from a list of candidates.
   */
  pickBestStore: async (
    nearbyStores: (SavedLocation & { distance: number })[]
  ): Promise<(SavedLocation & { distance: number }) | null> => {
    if (nearbyStores.length === 0) return null;

    const state = await notificationAnalytics.getState();

    // Filter out cooling down stores
    const eligibleStores = nearbyStores.filter((store) => {
      // We don't check global cooldown here, because if global cooldown is active, 
      // NONE of the stores will pass the final check anyway.
      // But we do check store cooldowns to skip to the next eligible store.
      if (notificationAnalytics.isStoreCoolingDown(state, store.id)) return false;
      if (notificationAnalytics.hasFingerprint(state, store.id)) return false;
      
      return true;
    });

    if (eligibleStores.length === 0) return null;

    // Return closest
    return eligibleStores[0];
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
