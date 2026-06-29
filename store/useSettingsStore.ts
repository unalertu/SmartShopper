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
  isPro: true,
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

      setLocationEnabled: (enabled: boolean) => set({ locationEnabled: enabled }),

      setDistanceUnit: (unit: DistanceUnit) => set({ distanceUnit: unit }),
      setTheme: (theme: ThemeOption) => set({ theme }),
      setSmartSuggestionsEnabled: (enabled: boolean) =>
        set({ smartSuggestionsEnabled: enabled }),
      setAutoDeletePurchased: (enabled: boolean) =>
        set({ autoDeletePurchased: enabled }),
      setIsPro: (enabled: boolean) => set({ isPro: enabled }),
      resetSettings: () => set((state: SettingsState) => ({ ...DEFAULT_SETTINGS, isPro: state.isPro })),
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
