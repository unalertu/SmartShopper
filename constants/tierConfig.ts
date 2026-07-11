/**
 * Tier configuration for Free and Pro users.
 * Single source of truth for all monetization limits.
 *
 * IMPORTANT: Background notifications are NEVER disabled for free users.
 * Free users experience the full core value with soft quantity limits.
 * Pro is a power upgrade, not a requirement.
 */

import { NotificationSensitivity } from '../store/useSettingsStore';

export const FREE_TIER = {
  maxSavedStores: 4,
  maxLists: 4,
  maxItemsPerList: 25,
  maxLocationNotificationsPerDay: 4,
  maxNotificationsPerStorePerDay: 2,
  maxMutedShops: 5,
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
  maxNotificationsPerStorePerDay: 2,
  maxMutedShops: Infinity,
  canCustomizeNotifications: true,
  canSetQuietHours: true,
  canSetNotificationSchedules: true,
  canUsePriorityAlerts: true,
  canUseSmartNotificationRules: true,
  canUseAdvancedNotificationSettings: true,
  canDisableQuietHours: true,
} as const;

/**
 * Built-in active window applied to every user by default: alerts are only
 * delivered 08:00–22:00. Night-time silence is core trust behavior, never a
 * paid feature. Pro's Smart Schedule replaces this window with custom values.
 */
export const DEFAULT_ACTIVE_HOURS = { start: 8, end: 22 } as const;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export interface EffectiveSchedule {
  allowedDays: number[];
  startHour: number;
  endHour: number;
}

/**
 * Resolves the schedule the notification engine should enforce.
 * Free users (and Pro users without Smart Schedule) get the built-in window.
 */
export const resolveNotificationSchedule = (params: {
  isPro: boolean;
  smartScheduleEnabled: boolean;
  allowedDays: number[];
  allowedHoursStart: number;
  allowedHoursEnd: number;
}): EffectiveSchedule => {
  if (params.isPro && params.smartScheduleEnabled) {
    return {
      allowedDays: params.allowedDays,
      startHour: params.allowedHoursStart,
      endHour: params.allowedHoursEnd,
    };
  }
  return {
    allowedDays: ALL_DAYS,
    startHour: DEFAULT_ACTIVE_HOURS.start,
    endHour: DEFAULT_ACTIVE_HOURS.end,
  };
};

/**
 * Maps a NotificationSensitivity value to its corresponding distance in meters.
 * This is the single source of truth for all notification distance calculations.
 *
 * These are awareness radii; the notification itself fires from the inner
 * trigger zone, max(TRIGGER_ZONE_RATIO * radius, TRIGGER_ZONE_MIN_METERS):
 *   near 50      -> trigger 45m  (at the door; 45m is the practical iOS floor
 *                                 for accepted fixes, see MAX_GPS_ACCURACY)
 *   balanced 100 -> trigger 50m  (at the storefront)
 *   far 200      -> trigger 100m (early warning, inside a block; 100m
 *                                 effective in dense areas via density shrink)
 */
export const getAlertDistanceMeters = (sensitivity: NotificationSensitivity): number => {
  switch (sensitivity) {
    case 'near': return 50;
    case 'balanced': return 100;
    case 'far': return 200;
  }
};

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
 * Returns the max notifications per store per day for the given tier.
 */
export const getMaxNotificationsPerStorePerDay = (isPro: boolean): number =>
  isPro ? PRO_TIER.maxNotificationsPerStorePerDay : FREE_TIER.maxNotificationsPerStorePerDay;

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
