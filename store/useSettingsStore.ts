import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DistanceUnit = "metric" | "imperial";
export type ThemeOption = "system" | "light" | "dark";
export type NotificationSensitivity = "near" | "balanced" | "far";
export type MaxAlertsPerDay = 1 | 3 | 5 | 10 | "unlimited";

interface SettingsState {
  // ── Hydration ──
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // ── Notifications & Alerts ──
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  
  // ── Notification Preferences ──
  savedStoresOnly: boolean;
  shoppingListReminders: boolean;
  backgroundNotifications: boolean;
  lowPowerMode: boolean;
  autoOpenNearbyList: boolean;

  // ── Location ──
  locationEnabled: boolean;

  distanceUnit: DistanceUnit;

  // ── Appearance ──
  theme: ThemeOption;

  // ── Smart Features ──
  smartSuggestionsEnabled: boolean;
  autoDeletePurchased: boolean;

  // ── Subscription ──
  isPro: boolean;
  
  notificationSensitivity: NotificationSensitivity;
  maxAlertsPerDay: MaxAlertsPerDay;

  // ── Notification Schedule ──
  scheduleEnabled: boolean;
  allowedDays: number[];
  
  // ── Quiet Hours ──
  quietHoursEnabled: boolean;
  allowedHoursStart: number;
  allowedHoursEnd: number;

  // ── Actions ──
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  
  setSavedStoresOnly: (enabled: boolean) => void;
  setShoppingListReminders: (enabled: boolean) => void;
  setBackgroundNotifications: (enabled: boolean) => void;
  setLowPowerMode: (enabled: boolean) => void;
  setAutoOpenNearbyList: (enabled: boolean) => void;
  setNotificationSensitivity: (sensitivity: NotificationSensitivity) => void;
  setMaxAlertsPerDay: (maxAlerts: MaxAlertsPerDay) => void;
  setScheduleEnabled: (enabled: boolean) => void;
  setAllowedDays: (days: number[]) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setAllowedHoursStart: (hour: number) => void;
  setAllowedHoursEnd: (hour: number) => void;

  setLocationEnabled: (enabled: boolean) => void;

  setDistanceUnit: (unit: DistanceUnit) => void;
  setTheme: (theme: ThemeOption) => void;
  setSmartSuggestionsEnabled: (enabled: boolean) => void;
  setAutoDeletePurchased: (enabled: boolean) => void;
  setIsPro: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  _hasHydrated: false,
  notificationsEnabled: false,
  soundEnabled: true,
  hapticEnabled: true,
  
  savedStoresOnly: false,
  shoppingListReminders: true,
  backgroundNotifications: true,
  lowPowerMode: false,
  autoOpenNearbyList: false,
  notificationSensitivity: "balanced" as const,
  maxAlertsPerDay: 5 as MaxAlertsPerDay,
  scheduleEnabled: false,
  allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days allowed by default
  quietHoursEnabled: false,
  allowedHoursStart: 8, // 8 AM
  allowedHoursEnd: 22, // 10 PM

  locationEnabled: false,

  distanceUnit: "metric" as DistanceUnit,
  theme: "system" as ThemeOption,
  smartSuggestionsEnabled: true,
  autoDeletePurchased: false,
  isPro: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      setNotificationsEnabled: (enabled: boolean) =>
        set({ notificationsEnabled: enabled }),
      setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
      setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),
      
      setSavedStoresOnly: (enabled: boolean) => set({ savedStoresOnly: enabled }),
      setShoppingListReminders: (enabled: boolean) => set({ shoppingListReminders: enabled }),
      setBackgroundNotifications: (enabled: boolean) => set({ backgroundNotifications: enabled }),
      setLowPowerMode: (enabled: boolean) => set({ lowPowerMode: enabled }),
      setAutoOpenNearbyList: (enabled: boolean) => set({ autoOpenNearbyList: enabled }),
      setNotificationSensitivity: (sensitivity: NotificationSensitivity) => set({ notificationSensitivity: sensitivity }),
      setMaxAlertsPerDay: (maxAlerts: MaxAlertsPerDay) => set({ maxAlertsPerDay: maxAlerts }),
      setScheduleEnabled: (enabled: boolean) => set({ scheduleEnabled: enabled }),
      setAllowedDays: (days: number[]) => set({ allowedDays: days }),
      setQuietHoursEnabled: (enabled: boolean) => set({ quietHoursEnabled: enabled }),
      setAllowedHoursStart: (hour: number) => set({ allowedHoursStart: hour }),
      setAllowedHoursEnd: (hour: number) => set({ allowedHoursEnd: hour }),

      setLocationEnabled: (enabled: boolean) => set({ locationEnabled: enabled }),

      setDistanceUnit: (unit: DistanceUnit) => set({ distanceUnit: unit }),
      setTheme: (theme: ThemeOption) => set({ theme }),
      setSmartSuggestionsEnabled: (enabled: boolean) =>
        set({ smartSuggestionsEnabled: enabled }),
      setAutoDeletePurchased: (enabled: boolean) =>
        set({ autoDeletePurchased: enabled }),
      setIsPro: (enabled: boolean) => set((state) => {
        if (state.isPro && !enabled) {
          // Reset Pro-specific settings when downgrading to Free
          
          // Reset Map specific settings
          try {
            const { useLocationStore } = require('./useLocationStore');
            useLocationStore.getState().resetRadiuses();
          } catch (e) {
            console.error("Failed to reset location radiuses", e);
          }

          return {
            isPro: false,
            notificationSensitivity: DEFAULT_SETTINGS.notificationSensitivity,
            maxAlertsPerDay: 5,
            scheduleEnabled: DEFAULT_SETTINGS.scheduleEnabled,
            allowedDays: DEFAULT_SETTINGS.allowedDays,
            quietHoursEnabled: DEFAULT_SETTINGS.quietHoursEnabled,
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState: any, currentState: any) => ({
        ...currentState,
        ...persistedState,
        isPro: true,
      }),
    }
  )
);
