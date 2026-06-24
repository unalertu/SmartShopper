import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DistanceUnit = "metric" | "imperial";
export type ThemeOption = "system" | "light" | "dark";
export type NotificationSensitivity = "near" | "balanced" | "far";

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

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      
      setSavedStoresOnly: (enabled) => set({ savedStoresOnly: enabled }),
      setShoppingListReminders: (enabled) => set({ shoppingListReminders: enabled }),
      setBackgroundNotifications: (enabled) => set({ backgroundNotifications: enabled }),
      setLowPowerMode: (enabled) => set({ lowPowerMode: enabled }),
      setAutoOpenNearbyList: (enabled) => set({ autoOpenNearbyList: enabled }),
      setNotificationSensitivity: (sensitivity) => set({ notificationSensitivity: sensitivity }),

      setLocationEnabled: (enabled) => set({ locationEnabled: enabled }),

      setDistanceUnit: (unit) => set({ distanceUnit: unit }),
      setTheme: (theme) => set({ theme }),
      setSmartSuggestionsEnabled: (enabled) =>
        set({ smartSuggestionsEnabled: enabled }),
      setAutoDeletePurchased: (enabled) =>
        set({ autoDeletePurchased: enabled }),
      setIsPro: (enabled) => set({ isPro: enabled }),
      resetSettings: () => set((state) => ({ ...DEFAULT_SETTINGS, isPro: state.isPro })),
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
        isPro: false,
      }),
    }
  )
);
