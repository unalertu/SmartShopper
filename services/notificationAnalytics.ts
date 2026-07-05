/**
 * Notification Analytics Service
 *
 * Pure AsyncStorage persistence layer for notification tracking.
 * This is the single source of truth for:
 *   - Cooldowns (global, per-store)
 *   - Daily counters
 *   - Fingerprint deduplication
 *   - Notification history (capped at 100)
 *
 * Designed for background-task access — no Zustand dependency.
 * The UI layer (useNotificationsStore) syncs from this service.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIFICATION_CONSTANTS } from "../constants";
import { useStatsStore } from "../store/useStatsStore";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationHistoryEntry {
  id: string;
  type: "location" | "welcome";
  title: string;
  body: string;
  storeId?: string;
  timestamp: number;
  read: boolean;
}

export interface NotificationAnalyticsState {
  // Cooldowns
  lastNotificationAt: number | null;
  lastStoreNotifications: Record<string, number>;

  // Daily counters
  dailyCountDate: string;
  dailyLocationCount: number;
  dailyStoreCounts: Record<string, number>;

  // Fingerprint dedup
  sentFingerprints: string[];

  // Unfinished List Reminder
  unfinishedReminderId: string | null;
  unfinishedReminderScheduledAt: number | null;

  // Empty List Reminder
  emptyListReminderId: string | null;
  emptyListReminderScheduledAt: number | null;

  // History & Flags
  notificationHistory: NotificationHistoryEntry[];
  hasSentWelcome: boolean;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "notification-analytics-v1";

const DEFAULT_STATE: NotificationAnalyticsState = {
  lastNotificationAt: null,
  lastStoreNotifications: {},
  dailyCountDate: "",
  dailyLocationCount: 0,
  dailyStoreCounts: {},
  sentFingerprints: [],
  unfinishedReminderId: null,
  unfinishedReminderScheduledAt: null,
  emptyListReminderId: null,
  emptyListReminderScheduledAt: null,
  notificationHistory: [],
  hasSentWelcome: false,
};

const generateId = () =>
  `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// ── Service ──────────────────────────────────────────────────────────────────

export const notificationAnalytics = {
  // ── State Access ─────────────────────────────────────────────────────────

  getState: async (): Promise<NotificationAnalyticsState> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.error("notificationAnalytics getState error:", e);
    }
    return { ...DEFAULT_STATE };
  },

  saveState: async (state: NotificationAnalyticsState): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("notificationAnalytics saveState error:", e);
    }
  },

  // ── Unfinished List Reminder ───────────────────────────────────────────────

  setUnfinishedReminder: async (id: string, scheduledAt: number): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.unfinishedReminderId = id;
    state.unfinishedReminderScheduledAt = scheduledAt;
    await notificationAnalytics.saveState(state);
  },

  clearUnfinishedReminder: async (): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.unfinishedReminderId = null;
    state.unfinishedReminderScheduledAt = null;
    await notificationAnalytics.saveState(state);
  },

  setEmptyListReminder: async (id: string, scheduledAt: number): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.emptyListReminderId = id;
    state.emptyListReminderScheduledAt = scheduledAt;
    await notificationAnalytics.saveState(state);
  },

  clearEmptyListReminder: async (): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.emptyListReminderId = null;
    state.emptyListReminderScheduledAt = null;
    await notificationAnalytics.saveState(state);
  },

  // ── Daily Counter Reset ──────────────────────────────────────────────────

  /**
   * Resets daily counters and fingerprints if the day has changed.
   * Mutates and returns the state object.
   */
  resetDailyCountersIfNeeded: (
    state: NotificationAnalyticsState
  ): NotificationAnalyticsState => {
    const today = getTodayKey();
    if (state.dailyCountDate !== today) {
      state.dailyCountDate = today;
      state.dailyLocationCount = 0;
      state.dailyStoreCounts = {};
      state.sentFingerprints = [];
    }
    return state;
  },

  // ── Cooldown Checks ──────────────────────────────────────────────────────

  isGlobalCooldownActive: (state: NotificationAnalyticsState): boolean => {
    if (!state.lastNotificationAt) return false;
    return (
      Date.now() - state.lastNotificationAt <
      NOTIFICATION_CONSTANTS.GLOBAL_COOLDOWN_MS
    );
  },

  isStoreCoolingDown: (
    state: NotificationAnalyticsState,
    storeId: string
  ): boolean => {
    const lastSent = state.lastStoreNotifications[storeId];
    if (!lastSent) return false;
    return (
      Date.now() - lastSent < NOTIFICATION_CONSTANTS.STORE_COOLDOWN_MS
    );
  },

  // ── Daily Limit Check ────────────────────────────────────────────────────

  canSendDailyNotification: (
    state: NotificationAnalyticsState,
    isPro: boolean,
    maxAlertsPerDay: number | "unlimited"
  ): boolean => {
    if (maxAlertsPerDay === "unlimited") {
      return true;
    }
    return state.dailyLocationCount < maxAlertsPerDay;
  },

  // ── Fingerprint Dedup ────────────────────────────────────────────────────

  hasFingerprint: (
    state: NotificationAnalyticsState,
    storeId: string,
    eventId: number
  ): boolean => {
    const fp = `location:${storeId}:${eventId}`;
    return state.sentFingerprints.includes(fp);
  },

  addFingerprint: (
    state: NotificationAnalyticsState,
    storeId: string,
    eventId: number
  ): void => {
    const fp = `location:${storeId}:${eventId}`;
    if (!state.sentFingerprints.includes(fp)) {
      state.sentFingerprints.push(fp);
    }
  },

  // ── Record a Sent Notification ───────────────────────────────────────────

  /**
   * Records a notification as sent. Updates all tracking state:
   * cooldowns, daily counters, fingerprints, and history.
   * Persists to AsyncStorage automatically.
   */
  recordNotification: async (
    title: string,
    body: string,
    storeId: string,
    eventId: number
  ): Promise<void> => {
    const state = await notificationAnalytics.getState();

    // Reset daily counters if day changed
    notificationAnalytics.resetDailyCountersIfNeeded(state);

    // Update cooldowns
    const now = Date.now();
    state.lastNotificationAt = now;
    state.lastStoreNotifications[storeId] = now;

    // Increment daily counter
    state.dailyLocationCount += 1;

    // Increment per-store daily counter
    if (!state.dailyStoreCounts) state.dailyStoreCounts = {};
    state.dailyStoreCounts[storeId] = (state.dailyStoreCounts[storeId] || 0) + 1;

    // Increment lifetime counter for stats UI and start a session
    useStatsStore.getState().incrementRemindersSent();
    useStatsStore.getState().startShoppingSession();

    // Add fingerprint
    notificationAnalytics.addFingerprint(state, storeId, eventId);

    // Add to history
    const entry: NotificationHistoryEntry = {
      id: generateId(),
      type: "location",
      title,
      body,
      storeId,
      timestamp: now,
      read: false,
    };
    state.notificationHistory.unshift(entry);

    // Cap history at 100
    if (
      state.notificationHistory.length >
      NOTIFICATION_CONSTANTS.MAX_NOTIFICATION_HISTORY
    ) {
      state.notificationHistory = state.notificationHistory.slice(
        0,
        NOTIFICATION_CONSTANTS.MAX_NOTIFICATION_HISTORY
      );
    }

    await notificationAnalytics.saveState(state);
  },

  // ── Welcome Notification ─────────────────────────────────────────────────

  /**
   * Adds a welcome notification to history (no system push).
   * Called once on first app launch.
   */
  addWelcomeNotification: async (
    title: string,
    body: string
  ): Promise<void> => {
    const state = await notificationAnalytics.getState();
    
    // Prevent adding if already sent
    if (state.hasSentWelcome) return;

    const entry: NotificationHistoryEntry = {
      id: generateId(),
      type: "welcome",
      title,
      body,
      timestamp: Date.now(),
      read: false,
    };
    state.notificationHistory.unshift(entry);
    state.hasSentWelcome = true;

    // Cap history
    if (
      state.notificationHistory.length >
      NOTIFICATION_CONSTANTS.MAX_NOTIFICATION_HISTORY
    ) {
      state.notificationHistory = state.notificationHistory.slice(
        0,
        NOTIFICATION_CONSTANTS.MAX_NOTIFICATION_HISTORY
      );
    }

    await notificationAnalytics.saveState(state);
  },

  // ── UI Data Access ───────────────────────────────────────────────────────

  getHistory: async (): Promise<NotificationHistoryEntry[]> => {
    const state = await notificationAnalytics.getState();
    return state.notificationHistory;
  },

  markAsRead: async (id: string): Promise<void> => {
    const state = await notificationAnalytics.getState();
    const entry = state.notificationHistory.find((n) => n.id === id);
    if (entry) {
      entry.read = true;
      await notificationAnalytics.saveState(state);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.notificationHistory.forEach((n) => {
      n.read = true;
    });
    await notificationAnalytics.saveState(state);
  },

  removeNotification: async (id: string): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.notificationHistory = state.notificationHistory.filter(
      (n) => n.id !== id
    );
    await notificationAnalytics.saveState(state);
  },

  clearHistory: async (): Promise<void> => {
    const state = await notificationAnalytics.getState();
    state.notificationHistory = [];
    await notificationAnalytics.saveState(state);
  },
};
