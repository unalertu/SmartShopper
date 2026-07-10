import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAlertDistanceMeters, ALL_DAYS, DEFAULT_ACTIVE_HOURS } from "../constants";
import * as Localization from 'expo-localization';

export type DistanceUnit = "metric" | "imperial";
export type ThemeOption = "system" | "light" | "dark";
export type NotificationSensitivity = "near" | "balanced" | "far";
export type MaxAlertsPerDay = 1 | 3 | 5 | 10 | "unlimited";

const getDefaultDistanceUnit = (): DistanceUnit => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      return locales[0].regionCode === 'US' ? 'imperial' : 'metric';
    }
  } catch (e) {
    console.warn("Failed to get locale", e);
  }
  return 'metric';
};

interface SettingsState {
  // ── Hydration ──
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // ── Onboarding ──
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (state: boolean) => void;

  // ── Notifications & Alerts ──
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;

  // ── Notification Preferences ──
  savedStoresOnly: boolean;
  shoppingListReminders: boolean;
  // Nearby-shop alerts fire even when there is no active shopping list
  remindWithoutList: boolean;

  // Pause alerts until this epoch ms; null when not paused. Free feature.
  snoozeUntil: number | null;

  // ── Location ──
  locationEnabled: boolean;

  distanceUnit: DistanceUnit;

  // ── Appearance ──
  theme: ThemeOption;

  // ── Smart Features ──
  autoDeletePurchased: boolean;

  // ── Subscription ──
  isPro: boolean;

  notificationSensitivity: NotificationSensitivity;
  maxAlertsPerDay: MaxAlertsPerDay;

  // ── Smart Schedule (Pro) ──
  // When enabled, replaces the built-in active window (08–22, every day)
  // with the custom days + time window below.
  smartScheduleEnabled: boolean;
  allowedDays: number[];
  allowedHoursStart: number;
  allowedHoursEnd: number;

  // ── Actions ──
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;

  setSavedStoresOnly: (enabled: boolean) => void;
  setShoppingListReminders: (enabled: boolean) => void;
  setRemindWithoutList: (enabled: boolean) => void;
  setSnoozeUntil: (until: number | null) => void;
  setNotificationSensitivity: (sensitivity: NotificationSensitivity) => void;
  setMaxAlertsPerDay: (maxAlerts: MaxAlertsPerDay) => void;
  setSmartScheduleEnabled: (enabled: boolean) => void;
  setAllowedDays: (days: number[]) => void;
  setAllowedHoursStart: (hour: number) => void;
  setAllowedHoursEnd: (hour: number) => void;

  setLocationEnabled: (enabled: boolean) => void;

  setDistanceUnit: (unit: DistanceUnit) => void;
  setTheme: (theme: ThemeOption) => void;
  setAutoDeletePurchased: (enabled: boolean) => void;
  setIsPro: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  _hasHydrated: false,
  hasCompletedOnboarding: false,
  notificationsEnabled: false,
  soundEnabled: true,
  hapticEnabled: true,

  savedStoresOnly: false,
  shoppingListReminders: true,
  remindWithoutList: false,
  snoozeUntil: null as number | null,
  notificationSensitivity: "balanced" as const,
  maxAlertsPerDay: 5 as MaxAlertsPerDay,
  smartScheduleEnabled: false,
  allowedDays: ALL_DAYS,
  allowedHoursStart: DEFAULT_ACTIVE_HOURS.start,
  allowedHoursEnd: DEFAULT_ACTIVE_HOURS.end,

  locationEnabled: false,

  distanceUnit: getDefaultDistanceUnit(),
  theme: "system" as ThemeOption,
  autoDeletePurchased: false,
  isPro: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      setHasCompletedOnboarding: (state: boolean) => set({ hasCompletedOnboarding: state }),
      setNotificationsEnabled: (enabled: boolean) =>
        set({ notificationsEnabled: enabled }),
      setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
      setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),

      setSavedStoresOnly: (enabled: boolean) => set({ savedStoresOnly: enabled }),
      setShoppingListReminders: (enabled: boolean) => set({ shoppingListReminders: enabled }),
      setRemindWithoutList: (enabled: boolean) => set({ remindWithoutList: enabled }),
      setSnoozeUntil: (until: number | null) => set({ snoozeUntil: until }),
      setNotificationSensitivity: (sensitivity: NotificationSensitivity) => {
        set({ notificationSensitivity: sensitivity });
        try {
          const { geofenceManager } = require('../services/geofenceManager');
          void geofenceManager.syncSavedStores(getAlertDistanceMeters(sensitivity));
        } catch (e) {
          console.error("Failed to sync radiuses", e);
        }
      },
      setMaxAlertsPerDay: (maxAlerts: MaxAlertsPerDay) => set({ maxAlertsPerDay: maxAlerts }),
      setSmartScheduleEnabled: (enabled: boolean) => set({ smartScheduleEnabled: enabled }),
      setAllowedDays: (days: number[]) => set({ allowedDays: days }),
      setAllowedHoursStart: (hour: number) => set({ allowedHoursStart: hour }),
      setAllowedHoursEnd: (hour: number) => set({ allowedHoursEnd: hour }),

      setLocationEnabled: (enabled: boolean) => set({ locationEnabled: enabled }),

      setDistanceUnit: (unit: DistanceUnit) => set({ distanceUnit: unit }),
      setTheme: (theme: ThemeOption) => set({ theme }),
      setAutoDeletePurchased: (enabled: boolean) =>
        set({ autoDeletePurchased: enabled }),
      setIsPro: (enabled: boolean) => set((state: SettingsState) => {
        if (state.isPro && !enabled) {
          // Reset Pro-specific settings when downgrading to Free
          try {
            const { geofenceManager } = require('../services/geofenceManager');
            void geofenceManager.syncSavedStores(getAlertDistanceMeters(DEFAULT_SETTINGS.notificationSensitivity));
          } catch (e) {
            console.error("Failed to sync radiuses", e);
          }

          return {
            isPro: false,
            notificationSensitivity: DEFAULT_SETTINGS.notificationSensitivity,
            maxAlertsPerDay: 5,
            smartScheduleEnabled: DEFAULT_SETTINGS.smartScheduleEnabled,
            allowedDays: DEFAULT_SETTINGS.allowedDays,
            allowedHoursStart: DEFAULT_SETTINGS.allowedHoursStart,
            allowedHoursEnd: DEFAULT_SETTINGS.allowedHoursEnd,
          };
        }

        if (!state.isPro && enabled) {
          // Grant unlimited alerts when upgrading to Pro
          return {
            isPro: true,
            maxAlertsPerDay: "unlimited",
          };
        }

        return { isPro: enabled };
      }),
      resetSettings: () => set((state: SettingsState) => ({
        ...DEFAULT_SETTINGS,
        isPro: state.isPro,
        maxAlertsPerDay: state.isPro ? "unlimited" : 5
      })),
    }),
    {
      name: "settings-storage",
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 3 && persistedState && typeof persistedState === 'object') {
          // v2 -> v3: the separate Allowed Hours (quietHoursEnabled) and
          // Notification Schedule (scheduleEnabled) settings merged into
          // one Smart Schedule flag; dead settings dropped.
          persistedState.smartScheduleEnabled =
            persistedState.quietHoursEnabled === true || persistedState.scheduleEnabled === true;
          delete persistedState.quietHoursEnabled;
          delete persistedState.scheduleEnabled;
          delete persistedState.lowPowerMode;
          delete persistedState.autoOpenNearbyList;
          delete persistedState.smartSuggestionsEnabled;
          delete persistedState.backgroundNotifications;
          // isPro was forced true by a dev override in earlier builds; drop
          // the persisted value so entitlements (RevenueCat) decide it.
          delete persistedState.isPro;
        }
        return persistedState;
      },
    }
  )
);
