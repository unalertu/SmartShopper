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
    mutedDays?: number[];
  }): Promise<{ allowed: boolean; reason?: string }> => {
    const state = await notificationAnalytics.getState();

    // 1. Global Cooldown Check
    const isGlobalCooling = notificationAnalytics.isGlobalCooldownActive(state);
    if (isGlobalCooling) {
      return { allowed: false, reason: "global_cooldown" };
    }

    // 2. Store Cooldown Check
    const isStoreCooling = notificationAnalytics.isStoreCoolingDown(state, params.storeId);
    if (isStoreCooling) {
      return { allowed: false, reason: "store_cooldown" };
    }

    // 3. Quiet Hours Check
    if (notificationEngine.isInQuietHours(params.nightNotificationsEnabled)) {
      return { allowed: false, reason: "quiet_hours" };
    }

    // 3.5. Muted Days Check
    if (params.mutedDays && params.mutedDays.length > 0) {
      const currentDay = new Date().getDay();
      if (params.mutedDays.includes(currentDay)) {
        return { allowed: false, reason: "muted_day" };
      }
    }

    // 4. Daily Limit Check
    const canSend = notificationAnalytics.canSendDailyNotification(state, params.isPro);
    if (!canSend) {
      return { allowed: false, reason: "daily_limit_reached" };
    }

    // 5. Fingerprint Deduplication Check
    const hasSent = notificationAnalytics.hasFingerprint(state, params.storeId);
    if (hasSent) {
      return { allowed: false, reason: "fingerprint_dedup" };
    }

    return { allowed: true };
  },

  /**
   * Pick the best store from a list of candidates.
   */
  pickBestStore: async (
    nearbyStores: (SavedLocation & { distance: number })[],
    unpurchasedItemCount: number
  ): Promise<(SavedLocation & { distance: number }) | null> => {
    if (nearbyStores.length === 0) return null;

    const scoredStores = nearbyStores.map(store => {
      let score = 0;
      // Saved store bonus (isUnsaved will be set by geoEngine for background discoveries)
      score += (store as any).isUnsaved ? 0 : 100;
      // Proximity bonus: (1 - distance/radius) * 30
      const radius = store.radius || 150;
      score += Math.max(0, (1 - store.distance / radius) * 30);
      // Item count bonus: up to 50 points
      score += 5 * Math.min(unpurchasedItemCount, 10);

      return { ...store, score };
    });

    // Sort descending by score
    scoredStores.sort((a, b) => b.score - a.score);
    return scoredStores[0];
  },

  buildNotificationContent: async (
    storeName: string,
    unpurchasedItems: { name: string }[]
  ): Promise<{ title: string; body: string }> => {
    const maxShow = 3;
    const names = unpurchasedItems.slice(0, maxShow).map((i) => i.name);
    const remaining = unpurchasedItems.length - maxShow;

    let body = `You still need: ${names.join(", ")}`;
    if (remaining > 0) {
      body += ` (+${remaining} more)`;
    }

    return {
      title: `You're near ${storeName}`,
      body,
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
