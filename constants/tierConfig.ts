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
  maxLocationNotificationsPerDay: 4,
  maxMutedShops: 5,
  fixedGeofenceRadius: 150, // meters
  canCustomizeGeofenceRadius: false,
  canCustomizeNotifications: false,
  canSetQuietHours: false,
  canSetNotificationSchedules: false,
  canUsePriorityAlerts: false,
  canUseSmartNotificationRules: false,
  canUseAdvancedNotificationSettings: false,
  canDisableQuietHours: false,
} as const;

export const PRO_TIER = {
  maxSavedStores: Infinity, // changed to unlimited as requested
  maxLists: Infinity,
  maxItemsPerList: Infinity,
  maxLocationNotificationsPerDay: Infinity,
  maxMutedShops: Infinity,
  geofenceRadiusOptions: [100, 150, 250, 500] as const,
  canCustomizeGeofenceRadius: true,
  canCustomizeNotifications: true,
  canSetQuietHours: true,
  canSetNotificationSchedules: true,
  canUsePriorityAlerts: true,
  canUseSmartNotificationRules: true,
  canUseAdvancedNotificationSettings: true,
  canDisableQuietHours: true,
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
 * Returns the max location notifications per day for the given tier.
 */
export const getMaxLocationNotificationsPerDay = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxLocationNotificationsPerDay : FREE_TIER.maxLocationNotificationsPerDay;

/**
 * Returns the max shopping lists for the given tier.
 */
export const getMaxLists = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxLists : FREE_TIER.maxLists;

/**
 * Returns the max items per list for the given tier.
 */
export const getMaxItemsPerList = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxItemsPerList : FREE_TIER.maxItemsPerList;

/**
 * Returns the max muted shops for the given tier.
 */
export const getMaxMutedShops = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxMutedShops : FREE_TIER.maxMutedShops;

/**
 * Returns the available geofence radius options for the given tier.
 */
export const getGeofenceRadiusOptions = (isPro: boolean): readonly number[] =>
  isPro ? PRO_TIER.geofenceRadiusOptions : [FREE_TIER.fixedGeofenceRadius];
