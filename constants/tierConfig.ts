/**
 * Tier configuration for Free and Pro users.
 * Single source of truth for all monetization limits.
 *
 * IMPORTANT: Background notifications are NEVER disabled for free users.
 * Free users experience the full core value with soft quantity limits.
 * Pro is a power upgrade, not a requirement.
 */

export const FREE_TIER = {
  maxSavedStores: 4,
  maxLists: 4,
  maxItemsPerList: 25,
  maxNotificationsPerDay: 5,
  maxNearbyAlertsPerDay: 5,
  fixedGeofenceRadius: 100, // meters
  canCustomizeGeofenceRadius: false,
  canCustomizeNotifications: false,
  canSetQuietHours: false,
  canSetNotificationSchedules: false,
  canUsePriorityAlerts: false,
  canUseSmartNotificationRules: false,
  canUseAdvancedNotificationSettings: false,
} as const;

export const PRO_TIER = {
  maxSavedStores: 20, // aligned with iOS geofence limitations
  maxLists: Infinity,
  maxItemsPerList: 500,
  maxNotificationsPerDay: Infinity,
  maxNearbyAlertsPerDay: Infinity,
  minGeofenceRadius: 50, // meters
  maxGeofenceRadius: 1000, // meters
  canCustomizeGeofenceRadius: true,
  canCustomizeNotifications: true,
  canSetQuietHours: true,
  canSetNotificationSchedules: true,
  canUsePriorityAlerts: true,
  canUseSmartNotificationRules: true,
  canUseAdvancedNotificationSettings: true,
} as const;

/**
 * Returns the appropriate tier config based on subscription status.
 */
export const getTierConfig = (isPro: boolean) => isPro ? PRO_TIER : FREE_TIER;

/**
 * Returns the max saved stores for the given tier.
 */
export const getMaxSavedStores = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxSavedStores : FREE_TIER.maxSavedStores;

/**
 * Returns the max notifications per day for the given tier.
 */
export const getMaxNotificationsPerDay = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxNotificationsPerDay : FREE_TIER.maxNotificationsPerDay;

/**
 * Returns the max nearby alerts per day for the given tier.
 */
export const getMaxNearbyAlertsPerDay = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxNearbyAlertsPerDay : FREE_TIER.maxNearbyAlertsPerDay;

/**
 * Returns the max shopping lists for the given tier.
 */
export const getMaxLists = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxLists : FREE_TIER.maxLists;

/**
 * Returns the max items per list for the given tier.
 */
export const getMaxItemsPerList = (isPro: boolean): number => // forced reload
  isPro ? PRO_TIER.maxItemsPerList : FREE_TIER.maxItemsPerList;

