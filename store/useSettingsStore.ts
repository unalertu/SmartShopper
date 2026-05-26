import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DistanceUnit = "metric" | "imperial";
export type ThemeOption = "system" | "light" | "dark";


interface SettingsState {
  // ── Hydration ──
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // ── Notifications & Alerts ──
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;

  // ── Location ──
  locationEnabled: boolean;

  distanceUnit: DistanceUnit;

  // ── Appearance ──
  theme: ThemeOption;

  // ── Smart Features ──
  smartSuggestionsEnabled: boolean;
  autoDeletePurchased: boolean;

  // ── Actions ──
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setLocationEnabled: (enabled: boolean) => void;

  setDistanceUnit: (unit: DistanceUnit) => void;
  setTheme: (theme: ThemeOption) => void;
  setSmartSuggestionsEnabled: (enabled: boolean) => void;
  setAutoDeletePurchased: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  _hasHydrated: false,
  notificationsEnabled: false,
  soundEnabled: true,
  hapticEnabled: true,
  locationEnabled: false,

  distanceUnit: "metric" as DistanceUnit,
  theme: "system" as ThemeOption,
  smartSuggestionsEnabled: true,
  autoDeletePurchased: false,
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
      setLocationEnabled: (enabled) => set({ locationEnabled: enabled }),

      setDistanceUnit: (unit) => set({ distanceUnit: unit }),
      setTheme: (theme) => set({ theme }),
      setSmartSuggestionsEnabled: (enabled) =>
        set({ smartSuggestionsEnabled: enabled }),
      setAutoDeletePurchased: (enabled) =>
        set({ autoDeletePurchased: enabled }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
