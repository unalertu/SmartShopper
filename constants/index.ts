export { Colors, Spacing, BorderRadius, FontSize } from "./theme";
export { CATEGORIES, UNITS, getCategoryIcon, getCategoryLabel } from "./Categories";
export { FREE_TIER, PRO_TIER, getTierConfig, getMaxSavedStores, getMaxLocationNotificationsPerDay, getMaxLists, getMaxItemsPerList, getAlertDistanceMeters, getMaxNotificationsPerStorePerDay, resolveNotificationSchedule, DEFAULT_ACTIVE_HOURS, ALL_DAYS } from "./tierConfig";
export type { EffectiveSchedule } from "./tierConfig";

export const NOTIFICATION_CONSTANTS = {
  // Cooldowns
  GLOBAL_COOLDOWN_MS: 15 * 60 * 1000,
  STORE_COOLDOWN_MS: 8 * 60 * 60 * 1000,
  // Dwell
  DWELL_TIME_MS: 20 * 1000,
  // Speed
  SPEED_THRESHOLD_MS: 6.94,
  SPEED_WINDOW_SIZE: 3,
  // Stop detection: avg speed above this counts as actively moving and
  // resets the stationarity anchor
  STOP_SPEED_THRESHOLD_MS: 1.0,
  // Motion evidence older than this is discarded (indoor fixes report
  // invalid speed, so stale walking samples must not pin the average)
  SPEED_SAMPLE_MAX_AGE_MS: 90_000,
  // Stop confirmation: the user counts as stopped only after holding
  // position within the anchor radius for this long. Fails closed —
  // walking past never accrues stop time, unknown motion is not a stop.
  STOP_CONFIRM_MS: 60_000,
  // Anchor radius absorbs GPS jitter while stationary (expanded to the
  // fix accuracy when worse); a pedestrian covers more than this between
  // background fixes, so real walking always resets the anchor
  STOP_ANCHOR_RADIUS_M: 60,
  // Two-zone trigger: notification fires only inside the inner ring
  TRIGGER_ZONE_RATIO: 0.6,
  TRIGGER_ZONE_MIN_METERS: 60,
  // Trip suppression: after any alert, suppress all stores until the user
  // moves this far from the alert point or this much time passes
  TRIP_SUPPRESSION_DISTANCE: 300,
  TRIP_SUPPRESSION_MS: 30 * 60 * 1000,
  // Density adaptation: shrink the effective radius in dense areas
  DENSITY_STORE_THRESHOLD: 6,
  DENSITY_SHRINK_RATIO: 2 / 3,
  DENSITY_MIN_RADIUS: 100,
  // Native fences: register at least this wide (iOS regions are unreliable
  // below ~150m), then confirm the real distance on enter
  NATIVE_FENCE_MIN_RADIUS: 150,
  NATIVE_CONFIRM_MAX_AGE_MS: 2 * 60 * 1000,
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
  MAX_NOTIFICATION_HISTORY: 30,
} as const;
