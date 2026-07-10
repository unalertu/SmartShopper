import { notificationAnalytics } from "./notificationAnalytics";
import { SavedLocation } from "../store/useLocationStore";
import { useShoppingListStore } from "../store/useShoppingListStore";
import * as Notifications from "expo-notifications";

export const notificationEngine = {
  /**
   * Core decision: Should we send a location notification?
   */
  shouldSendLocationNotification: async (params: {
    storeId: string;
    eventId: number;
    isPro: boolean;
    maxAlertsPerDay: number | "unlimited";
    maxNotificationsPerStorePerDay: number | "unlimited";
    // Effective schedule, already resolved via resolveNotificationSchedule
    allowedDays: number[];
    allowedHoursStart: number;
    allowedHoursEnd: number;
    snoozeUntil: number | null;
    shoppingListReminders: boolean;
    coords?: { latitude: number; longitude: number };
  }): Promise<{ allowed: boolean; reason?: string }> => {
    if (!params.shoppingListReminders) {
      return { allowed: false, reason: "location_alerts_disabled" };
    }

    // 0. Snooze Check (user-initiated pause, free feature)
    if (params.snoozeUntil !== null && Date.now() < params.snoozeUntil) {
      return { allowed: false, reason: "snoozed" };
    }

    const state = await notificationAnalytics.getState();

    // 1. Global Cooldown Check
    const isGlobalCooling = notificationAnalytics.isGlobalCooldownActive(state);
    if (isGlobalCooling) {
      return { allowed: false, reason: "global_cooldown" };
    }

    // 1.5 Trip Suppression Check (one walk, one reminder)
    if (
      params.coords &&
      notificationAnalytics.isTripSuppressionActive(
        state,
        params.coords.latitude,
        params.coords.longitude
      )
    ) {
      return { allowed: false, reason: "trip_suppression" };
    }

    // 2. Store Cooldown Check
    const isStoreCooling = notificationAnalytics.isStoreCoolingDown(state, params.storeId);
    if (isStoreCooling) {
      return { allowed: false, reason: "store_cooldown" };
    }

    // 3. Schedule Check (Days and Hours)
    if (!notificationEngine.isScheduleAllowed({
      allowedDays: params.allowedDays,
      allowedHoursStart: params.allowedHoursStart,
      allowedHoursEnd: params.allowedHoursEnd,
    })) {
      return { allowed: false, reason: "outside_schedule" };
    }

    // 4. Daily Limit Check
    const canSend = notificationAnalytics.canSendDailyNotification(state, params.isPro, params.maxAlertsPerDay);
    if (!canSend) {
      return { allowed: false, reason: "daily_limit_reached" };
    }

    // 4.5 Daily Store Limit Check
    if (params.maxNotificationsPerStorePerDay !== "unlimited") {
      const storeCount = state.dailyStoreCounts?.[params.storeId] || 0;
      if (storeCount >= params.maxNotificationsPerStorePerDay) {
        return { allowed: false, reason: "store_daily_limit_reached" };
      }
    }

    // 5. Fingerprint Deduplication Check
    const hasSent = notificationAnalytics.hasFingerprint(state, params.storeId, params.eventId);
    if (hasSent) {
      return { allowed: false, reason: "fingerprint_dedup" };
    }

    return { allowed: true };
  },

  /**
   * Pick the best store from a list of candidates.
   * @param alertDistance - The global Alert Distance in meters, derived from notificationSensitivity
   */
  pickBestStore: async (
    nearbyStores: (SavedLocation & { distance: number })[],
    alertDistance: number
  ): Promise<(SavedLocation & { distance: number }) | null> => {
    if (nearbyStores.length === 0) return null;

    const scoredStores = nearbyStores.map(store => {
      let score = 0;
      // Saved store bonus (isUnsaved will be set by geoEngine for background discoveries)
      score += (store as any).isUnsaved ? 0 : 100;
      // Proximity bonus: (1 - distance/alertDistance) * 30
      score += Math.max(0, (1 - store.distance / alertDistance) * 30);

      return { ...store, score };
    });

    // Sort descending by score
    scoredStores.sort((a, b) => b.score - a.score);
    return scoredStores[0];
  },

  buildNotificationContent: async (
    storeName: string,
    unpurchasedItems: { name: string }[],
    isPro: boolean = true,
    maxAlertsPerDay: number | "unlimited" = "unlimited"
  ): Promise<{ title: string; body: string }> => {
    let body: string;
    if (unpurchasedItems.length === 0) {
      // Remind Without a List: no active list, generic nudge instead
      body = "🛒 Need anything? Start a list while you're here";
    } else {
      const maxShow = 3;
      const names = unpurchasedItems.slice(0, maxShow).map((i) => i.name);
      const remaining = unpurchasedItems.length - maxShow;

      body = `🛒 ${names.join(", ")}`;
      if (remaining > 0) {
        body += ` +${remaining} more`;
      }
      body += unpurchasedItems.length === 1 ? " is on your list" : " are on your list";
    }

    if (!isPro && typeof maxAlertsPerDay === 'number') {
      const state = await notificationAnalytics.getState();
      const currentCount = state.dailyLocationCount;
      if (currentCount + 1 >= maxAlertsPerDay) {
        body += `\n\nYou have reached your free daily notification limit.`;
      }
    }

    return {
      title: `You're near ${storeName}`,
      body,
    };
  },



  // Enforces the effective schedule (see resolveNotificationSchedule):
  // free users always run the built-in window, Pro's Smart Schedule
  // supplies custom values.
  isScheduleAllowed: (params: {
    allowedDays: number[];
    allowedHoursStart: number;
    allowedHoursEnd: number;
  }): boolean => {
    const currentDay = new Date().getDay();
    if (!params.allowedDays.includes(currentDay)) {
      return false; // Day is not allowed
    }

    const hour = new Date().getHours();

    // Equal start/end means a 24-hour window (always allowed on allowed days)
    if (params.allowedHoursStart === params.allowedHoursEnd) {
      return true;
    }

    if (params.allowedHoursStart < params.allowedHoursEnd) {
      // Standard window (e.g. 8 AM to 10 PM)
      if (!(hour >= params.allowedHoursStart && hour < params.allowedHoursEnd)) return false;
    } else {
      // Overnight window (e.g. 10 PM to 8 AM)
      if (!(hour >= params.allowedHoursStart || hour < params.allowedHoursEnd)) return false;
    }

    return true;
  },

  isUserLikelyWalking: (speedMs: number | null): boolean => {
    if (speedMs === null || speedMs === undefined) return true; // unknown speed -> assume walking
    return speedMs < 6.94; // 25 km/h limit
  },



  syncUnfinishedListReminder: async (): Promise<void> => {
    const unpurchasedItems = useShoppingListStore.getState().items.filter(i => !i.isPurchased);
    const state = await notificationAnalytics.getState();
    const { unfinishedReminderId, unfinishedReminderScheduledAt } = state;

    if (unpurchasedItems.length === 0) {
      if (unfinishedReminderId) {
        await Notifications.cancelScheduledNotificationAsync(unfinishedReminderId);
        await notificationAnalytics.clearUnfinishedReminder();
      }
      return;
    }

    const maxShow = 3;
    const names = unpurchasedItems.slice(0, maxShow).map(i => i.name);
    const remaining = unpurchasedItems.length - maxShow;
    let body = `Don't forget: ${names.join(", ")}`;
    if (remaining > 0) {
      body += ` +${remaining} more`;
    }

    const content = {
      title: "Still need these items?",
      body,
      sound: "default" as const,
    };

    if (unfinishedReminderId && unfinishedReminderScheduledAt) {
      const date = new Date(unfinishedReminderScheduledAt);
      if (date.getTime() > Date.now()) {
        const newId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { 
            date, 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: "geofence-alerts" 
          },
          identifier: unfinishedReminderId,
        });
        await notificationAnalytics.setUnfinishedReminder(newId, unfinishedReminderScheduledAt);
      } else {
        const triggerDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const newId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { 
            date: triggerDate, 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: "geofence-alerts" 
          },
        });
        await notificationAnalytics.setUnfinishedReminder(newId, triggerDate.getTime());
      }
    } else {
      const triggerDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const newId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { 
          date: triggerDate, 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: "geofence-alerts" 
        },
      });
      await notificationAnalytics.setUnfinishedReminder(newId, triggerDate.getTime());
    }
  },

  syncEmptyListReminder: async (): Promise<void> => {
    const unpurchasedItems = useShoppingListStore.getState().items.filter(i => !i.isPurchased);
    const state = await notificationAnalytics.getState();
    const { emptyListReminderId, emptyListReminderScheduledAt } = state;

    if (unpurchasedItems.length > 0) {
      // User has unpurchased items, cancel empty list reminder if it exists
      if (emptyListReminderId) {
        await Notifications.cancelScheduledNotificationAsync(emptyListReminderId);
        await notificationAnalytics.clearEmptyListReminder();
      }
      return;
    }

    // User has no unpurchased items
    const content = {
      title: "Ready for your next shopping trip?",
      body: "Start a new list before you head to the store",
      sound: "default" as const,
    };

    if (emptyListReminderId && emptyListReminderScheduledAt) {
      const date = new Date(emptyListReminderScheduledAt);
      if (date.getTime() > Date.now()) {
        // Already scheduled in the future, don't change the time
        // Just update content in case it changed
        const newId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { 
            date, 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: "geofence-alerts" 
          },
          identifier: emptyListReminderId,
        });
        await notificationAnalytics.setEmptyListReminder(newId, emptyListReminderScheduledAt);
      } else {
        // Time has passed, reschedule 7 days out
        const triggerDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const newId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { 
            date: triggerDate, 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: "geofence-alerts" 
          },
        });
        await notificationAnalytics.setEmptyListReminder(newId, triggerDate.getTime());
      }
    } else {
      // Not scheduled yet, schedule 7 days out
      const triggerDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const newId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { 
          date: triggerDate, 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: "geofence-alerts" 
        },
      });
      await notificationAnalytics.setEmptyListReminder(newId, triggerDate.getTime());
    }
  },
};
