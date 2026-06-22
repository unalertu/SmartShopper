export { Colors, Spacing, BorderRadius, FontSize, GEOFENCE_DEFAULT_RADIUS } from "./theme";
export { CATEGORIES, UNITS, getCategoryIcon, getCategoryLabel } from "./Categories";
export { FREE_TIER, PRO_TIER, getTierConfig, getMaxSavedStores, getMaxLocationNotificationsPerDay, getMaxLists, getMaxItemsPerList } from "./tierConfig";

export const NOTIFICATION_CONSTANTS = {
  GLOBAL_COOLDOWN_MS: 30 * 60 * 1000,              // 30 minutes
  STORE_COOLDOWN_MS: 24 * 60 * 60 * 1000,          // 24 hours
  DWELL_TIME_MS: 10 * 1000,                        // TEST MODE: 10 seconds (was 30s)
  SPEED_THRESHOLD_MS: 6.94,                        // 25 km/h in m/s
  QUIET_HOURS_START: 22,
  QUIET_HOURS_END: 8,
  DEFAULT_GEOFENCE_RADIUS: 500,                    // TEST MODE: 500 (was 150)
  MAX_NOTIFICATION_HISTORY: 100,
} as const;
