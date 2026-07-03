export { Colors, Spacing, BorderRadius, FontSize } from "./theme";
export { CATEGORIES, UNITS, getCategoryIcon, getCategoryLabel } from "./Categories";
export { FREE_TIER, PRO_TIER, getTierConfig, getMaxSavedStores, getMaxLocationNotificationsPerDay, getMaxLists, getMaxItemsPerList, getAlertDistanceMeters, getMaxNotificationsPerStorePerDay } from "./tierConfig";

export const NOTIFICATION_CONSTANTS = {
  // Cooldowns
  GLOBAL_COOLDOWN_MS: 15 * 60 * 1000,
  STORE_COOLDOWN_MS: 8 * 60 * 60 * 1000,
  // Dwell
  DWELL_TIME_MS: 20 * 1000,
  // Speed
  SPEED_THRESHOLD_MS: 6.94,
  SPEED_WINDOW_SIZE: 3,
  MAX_LOCATION_AGE_MS: 30_000,
  // Quiet hours
  QUIET_HOURS_START: 22,
  QUIET_HOURS_END: 8,
  // Geofence
  MAX_NATIVE_GEOFENCES: 20,
  // GPS
  MAX_GPS_ACCURACY: 80,
  // Exit
  MIN_EXIT_DISTANCE: 150,
  EXIT_GRACE_PERIOD_MS: 30_000,
  REBALANCE_MIN_DISTANCE: 1000,
  COMMIT_DEBOUNCE_MS: 2500,
  // Cache
  MAX_CACHED_MARKETS: 5000,
  CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000,
  // History
  MAX_NOTIFICATION_HISTORY: 100,
} as const;
