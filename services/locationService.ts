/**
 * Location service utilities.
 * Background geofencing with tier-aware soft limits.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { geoEngine } from "./geoEngine";
import { notificationAnalytics } from "./notificationAnalytics";
import { sendLocalNotification } from "./notificationService";
import { useSettingsStore, NotificationSensitivity } from "../store/useSettingsStore";
import { NOTIFICATION_CONSTANTS, getAlertDistanceMeters, getMaxNotificationsPerStorePerDay, resolveNotificationSchedule } from "../constants";
import { useStatsStore } from "../store/useStatsStore";
import { useLocationStore } from "../store/useLocationStore";
import { useDebugStore } from "../store/useDebugStore";
import { fetchMarkets } from "./overpassService";
import { notificationEngine } from "./notificationEngine";

const SEARCH_RADIUS = 1000;
const OVERPASS_FETCH_RADIUS = 2500;
const MIN_NEARBY_CACHE_THRESHOLD = 3;

let speedHistory: { speed: number; timestamp: number }[] = [];
let stopAnchor: { latitude: number; longitude: number; since: number } | null = null;
const geofenceState: Map<string, 'outside' | 'inside'> = new Map();
const dwellTimers = new Map<string, number>();
const exitGraceTimers = new Map<string, number>();
const notifiedStores = new Map<string, { lat: number; lon: number; timestamp: number }>();

import { getCurrentLocation, getDistance } from "./locationUtils";
export { getCurrentLocation, getDistance };

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
};

export const BACKGROUND_LOCATION_TASK = "background-location-task";

export const getDwellTimersState = () => {
  return Array.from(dwellTimers.entries()).map(([id, entryTime]) => ({
    id,
    entryTime,
  }));
};

export const getSettingsFromStorage = async () => {
  try {
    const data = await AsyncStorage.getItem("settings-storage");
    if (data) {
      const parsed = JSON.parse(data);
      const state = parsed?.state || {};
      const isPro = state.isPro === true;
      // A Free user must never carry the Pro-only "unlimited" daily cap. It can
      // survive on-disk (e.g. the v2->v3 migration dropped isPro but not this
      // value) and would otherwise let the headless task fire unlimited alerts
      // before any in-app setIsPro reconciliation runs. Force the Free default.
      const rawMaxAlerts = state.maxAlertsPerDay ?? 5;
      const maxAlertsPerDay = (!isPro && rawMaxAlerts === 'unlimited') ? 5 : rawMaxAlerts;
      return {
        isPro,
        notificationsEnabled: state.notificationsEnabled !== false, // default true if not set
        savedStoresOnly: state.savedStoresOnly === true,
        // Pre-v3 storage has the old two flags instead of smartScheduleEnabled
        // (background task can run before rehydration persists the migration)
        smartScheduleEnabled: typeof state.smartScheduleEnabled === 'boolean'
          ? state.smartScheduleEnabled
          : state.scheduleEnabled === true || state.quietHoursEnabled === true,
        allowedDays: Array.isArray(state.allowedDays) ? state.allowedDays : [0, 1, 2, 3, 4, 5, 6],
        allowedHoursStart: typeof state.allowedHoursStart === 'number' ? state.allowedHoursStart : 8,
        allowedHoursEnd: typeof state.allowedHoursEnd === 'number' ? state.allowedHoursEnd : 22,
        snoozeUntil: typeof state.snoozeUntil === 'number' ? state.snoozeUntil : null,
        shoppingListReminders: state.shoppingListReminders !== false,
        remindWithoutList: state.remindWithoutList === true,
        notificationSensitivity: (state.notificationSensitivity || 'balanced') as NotificationSensitivity,
        maxAlertsPerDay,
        maxNotificationsPerStorePerDay: getMaxNotificationsPerStorePerDay(isPro),
      };
    }
  } catch (e) {
    console.error("getSettingsFromStorage error", e);
  }
  return {
    isPro: false,
    notificationsEnabled: true,
    savedStoresOnly: false,
    smartScheduleEnabled: false,
    allowedDays: [0, 1, 2, 3, 4, 5, 6],
    allowedHoursStart: 8,
    allowedHoursEnd: 22,
    snoozeUntil: null as number | null,
    shoppingListReminders: true,
    remindWithoutList: false,
    notificationSensitivity: 'balanced' as NotificationSensitivity,
    maxAlertsPerDay: 5 as number | 'unlimited',
    maxNotificationsPerStorePerDay: getMaxNotificationsPerStorePerDay(false),
  };
};

import { geofenceManager } from "./geofenceManager";

export const processLocationUpdate = async (location: Location.LocationObject) => {
  const { addDebugLog, incrementDebugMetric, setDebugMetric } = useDebugStore.getState();
  incrementDebugMetric("backgroundExecutions");
  addDebugLog("Background task started");

  const { latitude, longitude, speed, accuracy } = location.coords;
  addDebugLog(`Speed: ${speed ? speed.toFixed(2) : '0.00'} m/s, Acc: ${accuracy ? accuracy.toFixed(0) : '?'}m`);

  // 1. Settings Guard
  const settings = await getSettingsFromStorage();
  if (!settings.notificationsEnabled || !settings.shoppingListReminders) {
    addDebugLog("Notifications or location-based alerts disabled in settings");
    return;
  }

  // 1b. RESOLVE ALERT DISTANCE (single source of truth)
  const alertDistance = getAlertDistanceMeters(settings.notificationSensitivity);
  addDebugLog(`Alert distance: ${alertDistance}m (${settings.notificationSensitivity})`);

  // 2. GPS Accuracy Filter
  if (accuracy && accuracy > NOTIFICATION_CONSTANTS.MAX_GPS_ACCURACY) {
    addDebugLog(`GPS accuracy too low: ${accuracy.toFixed(0)}m. Ignoring.`);
    return;
  }

  // 3. Timestamp Validation
  const now = Date.now();
  if (now - location.timestamp > NOTIFICATION_CONSTANTS.MAX_LOCATION_AGE_MS) {
    addDebugLog(`Location too old: ${now - location.timestamp}ms. Ignoring.`);
    return;
  }

  // 4. Moving Average Speed (negative = invalid fix on iOS, skip those)
  if (speed !== null && speed >= 0) {
    speedHistory.push({ speed, timestamp: now });
    // Keep only last N
    if (speedHistory.length > NOTIFICATION_CONSTANTS.SPEED_WINDOW_SIZE) {
      speedHistory.shift();
    }
  }
  // Expire stale samples: indoor fixes carry invalid speed, so without this
  // the user's walking speeds from before entering would pin the average
  speedHistory = speedHistory.filter(
    (h) => now - h.timestamp <= NOTIFICATION_CONSTANTS.SPEED_SAMPLE_MAX_AGE_MS
  );

  let avgSpeed: number | null = null;
  if (speedHistory.length > 0) {
    avgSpeed = speedHistory.reduce((sum, h) => sum + h.speed, 0) / speedHistory.length;
  }

  // Stop confirmation via stationarity anchor: the anchor pins the first
  // fix of a potential stop; later fixes within the anchor radius accrue
  // stop time, and any real movement (by position or by a valid speed
  // reading) resets it. This fails closed: urban fixes often carry no
  // valid speed and arrive minutes apart (distanceInterval-paced on iOS),
  // so a per-fix speed check has no evidence exactly when the user is
  // walking past — proximity alone must never count as a stop.
  const isMovingBySpeed =
    avgSpeed !== null && avgSpeed > NOTIFICATION_CONSTANTS.STOP_SPEED_THRESHOLD_MS;
  const anchorRadius = Math.max(NOTIFICATION_CONSTANTS.STOP_ANCHOR_RADIUS_M, accuracy ?? 0);
  if (
    !stopAnchor ||
    isMovingBySpeed ||
    getDistance(latitude, longitude, stopAnchor.latitude, stopAnchor.longitude) > anchorRadius
  ) {
    stopAnchor = { latitude, longitude, since: now };
  }
  const stoppedForMs = now - stopAnchor.since;
  const isConfirmedStopped = stoppedForMs >= NOTIFICATION_CONSTANTS.STOP_CONFIRM_MS;
  addDebugLog(
    `Stationary for ${(stoppedForMs / 1000).toFixed(0)}s` +
    (isMovingBySpeed ? ` (moving: ${avgSpeed!.toFixed(2)}m/s)` : '')
  );

  if (avgSpeed !== null && avgSpeed > NOTIFICATION_CONSTANTS.SPEED_THRESHOLD_MS) {
    addDebugLog(`High avg speed detected: ${avgSpeed.toFixed(2)}m/s. Ignoring.`);
    return;
  }

  // 4.3 CHEAP LOCAL GATES (no I/O beyond the settings read above).
  // Snooze and the schedule window would block the notification at the very
  // end anyway; checking them here makes suppressed wake-ups (e.g. every
  // fix during quiet hours) nearly free — no cache scans, no network.
  // Placed after the accuracy/age/speed checks so the rebalance below only
  // ever sees validated, non-driving fixes — the same fixes that reached
  // the original late-stage rebalance call sites. Fence freshness is
  // decoupled from notification eligibility: rebalanceGeofences is a no-op
  // for <=20 saved stores and throttled to 1km of movement, so the nearest-20
  // native fence set stays current even across suppressed windows.
  if (settings.snoozeUntil !== null && now < settings.snoozeUntil) {
    addDebugLog("Snoozed. Skipping pipeline.");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }
  const earlySchedule = resolveNotificationSchedule(settings);
  if (!notificationEngine.isScheduleAllowed({
    allowedDays: earlySchedule.allowedDays,
    allowedHoursStart: earlySchedule.startHour,
    allowedHoursEnd: earlySchedule.endHour,
  })) {
    addDebugLog("Outside allowed schedule. Skipping pipeline.");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 4.5 GLOBAL SUPPRESSION (one storage read, before store scans / network).
  // Global cooldown and trip suppression would block the send at step 14;
  // checking them here skips the whole pipeline while they're active.
  // Per-store cooldowns, daily caps and dedup stay in shouldSend below.
  const analyticsState = await notificationAnalytics.getState();
  if (notificationAnalytics.isGlobalCooldownActive(analyticsState)) {
    addDebugLog("Global cooldown active. Skipping pipeline.");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }
  if (notificationAnalytics.isTripSuppressionActive(analyticsState, latitude, longitude)) {
    addDebugLog("Trip suppression active. Skipping pipeline.");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 5. Clean up old notified stores (> 24h)
  for (const [id, data] of notifiedStores) {
    if (now - data.timestamp > 24 * 60 * 60 * 1000) {
      notifiedStores.delete(id);
    }
  }

  // 6. Active List + Unpurchased Items (Single read)
  const activeList = await geoEngine.getActiveShoppingList();
  if ((!activeList || activeList.items.length === 0) && !settings.remindWithoutList) {
    addDebugLog("No active lists. Skipping Overpass fetch and geofencing.");
    return;
  }
  const unpurchasedItems = activeList?.items ?? [];

  // 7. FIND NEARBY STORES (Exclude saved)
  let nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS, true);
  addDebugLog(`Nearby cached unsaved stores: ${nearbyStores.length}`);

  // 8. OVERPASS FETCH (Cache miss)
  if (nearbyStores.length < MIN_NEARBY_CACHE_THRESHOLD && !settings.savedStoresOnly) {
    const lastCoords = useLocationStore.getState().lastBackgroundFetchCoords;
    let shouldFetch = true;
    if (lastCoords) {
      const distFromLastFetch = getDistance(latitude, longitude, lastCoords.latitude, lastCoords.longitude);
      if (distFromLastFetch < 1500) {
        addDebugLog(`Fetch throttled: Yes (${distFromLastFetch.toFixed(0)}m from last fetch)`);
        setDebugMetric("fetchThrottled", true);
        shouldFetch = false;
      }
    }

    if (shouldFetch) {
      setDebugMetric("fetchThrottled", false);
      addDebugLog("Overpass fetch started");
      incrementDebugMetric("overpassRequests");
      try {
        const bbox = geoEngine.getBoundingBox(latitude, longitude, OVERPASS_FETCH_RADIUS);
        const newMarkets = await fetchMarkets(bbox.south, bbox.west, bbox.north, bbox.east);
        addDebugLog(`Overpass fetch completed (${newMarkets.length} stores)`);
        
        if (newMarkets.length > 0) {
          useLocationStore.getState().appendCachedMarkets(newMarkets);
          useLocationStore.getState().setLastBackgroundFetchCoords({ latitude, longitude });
          nearbyStores = await geoEngine.getNearbyStores(latitude, longitude, settings.savedStoresOnly, SEARCH_RADIUS, true);
        }
      } catch (e: any) {
        addDebugLog(`Overpass fetch failed: ${e.message}`);
      }
    }
  }

  // 8.5 DENSITY-ADAPTIVE RADIUS
  // Dense areas (many candidates within the alert radius) shrink the
  // effective radius one step so one busy street can't flood the pipeline.
  // Uses the already-cached store list — no extra network or GPS.
  let effectiveAlertDistance = alertDistance;
  const candidatesInRadius = nearbyStores.filter((s) => s.distance <= alertDistance).length;
  if (candidatesInRadius > NOTIFICATION_CONSTANTS.DENSITY_STORE_THRESHOLD) {
    // Never expand: the 100m floor exceeds the "near" radius (50m)
    effectiveAlertDistance = Math.min(
      alertDistance,
      Math.max(
        Math.round(alertDistance * NOTIFICATION_CONSTANTS.DENSITY_SHRINK_RATIO),
        NOTIFICATION_CONSTANTS.DENSITY_MIN_RADIUS
      )
    );
    addDebugLog(`Dense area: ${candidatesInRadius} stores within ${alertDistance}m, effective radius ${effectiveAlertDistance}m`);
  }

  // 9. FILTER INSIDE STORES & MIN EXIT DISTANCE
  const insideStores = nearbyStores.filter(s => {
    if (s.distance > effectiveAlertDistance) return false;
    
    const notified = notifiedStores.get(s.id);
    if (notified) {
      const distFromNotify = getDistance(latitude, longitude, notified.lat, notified.lon);
      if (distFromNotify < NOTIFICATION_CONSTANTS.MIN_EXIT_DISTANCE) {
        addDebugLog(`Still too close to notified coords for ${s.name} (${distFromNotify.toFixed(0)}m)`);
        return false;
      } else {
        notifiedStores.delete(s.id); // cleared min exit distance
      }
    }
    return true;
  });

  const currentInsideIds = new Set(insideStores.map(s => s.id));

  // 10. ENTER DETECTION STATE MACHINE
  const enterEvents: string[] = [];
  const exitEvents: string[] = [];
  
  for (const id of currentInsideIds) {
    if (geofenceState.get(id) !== 'inside') {
      enterEvents.push(id);
      geofenceState.set(id, 'inside');
    }
  }
  for (const [id, state] of geofenceState) {
    if (state === 'inside' && !currentInsideIds.has(id)) {
      exitEvents.push(id);
      geofenceState.set(id, 'outside');
    }
  }

  // 11. EXIT GRACE PERIOD
  for (const id of exitEvents) {
    if (!exitGraceTimers.has(id)) {
      exitGraceTimers.set(id, now);
      addDebugLog(`Exit grace started for ${id}`);
    }
  }

  for (const [id, exitTime] of exitGraceTimers) {
    if (currentInsideIds.has(id)) {
      exitGraceTimers.delete(id); // re-entered
      addDebugLog(`Re-entered ${id}, cleared exit grace`);
    } else if (now - exitTime > NOTIFICATION_CONSTANTS.EXIT_GRACE_PERIOD_MS) {
      dwellTimers.delete(id);
      exitGraceTimers.delete(id);
      addDebugLog(`Exit grace expired for ${id}, cleared dwell timer`);
    }
  }

  // 12. DWELL TIME + TWO-ZONE TRIGGER + STOP CONFIRMATION
  // The alert distance is the awareness zone (arms timers); a notification
  // only fires from the inner trigger zone, and only once the user has
  // dwelled AND held position long enough to count as a confirmed stop —
  // walking past on the same street never fires.
  const triggerDistance = Math.max(
    effectiveAlertDistance * NOTIFICATION_CONSTANTS.TRIGGER_ZONE_RATIO,
    NOTIFICATION_CONSTANTS.TRIGGER_ZONE_MIN_METERS
  );

  const dwelledStores: typeof nearbyStores = [];
  for (const store of insideStores) {
    // We only process unsaved stores in this pipeline
    if (enterEvents.includes(store.id)) {
      if (!dwellTimers.has(store.id)) {
        addDebugLog(`Started dwell timer for ${store.name}`);
        dwellTimers.set(store.id, now);
      }
    } else if (dwellTimers.has(store.id)) {
      const entryTime = dwellTimers.get(store.id)!;
      const elapsed = now - entryTime;
      if (elapsed < NOTIFICATION_CONSTANTS.DWELL_TIME_MS) continue;
      if (!isConfirmedStopped) {
        addDebugLog(`Dwell met for ${store.name} but stop not confirmed (${(stoppedForMs / 1000).toFixed(0)}s stationary)`);
        continue;
      }
      if (store.distance > triggerDistance) {
        addDebugLog(`Dwell met for ${store.name} but outside trigger zone (${store.distance.toFixed(0)}m > ${triggerDistance.toFixed(0)}m)`);
        continue;
      }
      dwelledStores.push(store);
    }
  }

  if (dwelledStores.length === 0) {
    addDebugLog("No stores meeting dwell time");
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }
  addDebugLog(`Stores meeting dwell time: ${dwelledStores.map(s => s.name).join(', ')}`);

  // Record store visits
  for (const store of dwelledStores) {
    useStatsStore.getState().recordStoreVisit(store.id);
  }

  // 13. PICK BEST STORE
  const bestStore = await notificationEngine.pickBestStore(dwelledStores, effectiveAlertDistance);
  if (!bestStore) {
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 14. SHOULD SEND
  const eventId = dwellTimers.get(bestStore.id) || now;
  const schedule = resolveNotificationSchedule(settings);
  const decision = await notificationEngine.shouldSendLocationNotification({
    storeId: bestStore.id,
    eventId,
    isPro: settings.isPro,
    maxAlertsPerDay: settings.maxAlertsPerDay,
    maxNotificationsPerStorePerDay: settings.maxNotificationsPerStorePerDay,
    allowedDays: schedule.allowedDays,
    allowedHoursStart: schedule.startHour,
    allowedHoursEnd: schedule.endHour,
    snoozeUntil: settings.snoozeUntil,
    shoppingListReminders: settings.shoppingListReminders,
    coords: { latitude, longitude },
  });

  if (!decision.allowed) {
    addDebugLog(`Notification blocked: ${decision.reason}`);
    void geofenceManager.rebalanceGeofences(latitude, longitude);
    return;
  }

  // 15. SEND NOTIFICATION
  addDebugLog("Notification triggered");
  incrementDebugMetric("notificationsTriggered");

  const content = await notificationEngine.buildNotificationContent(
    bestStore.name,
    unpurchasedItems,
    settings.isPro,
    settings.maxAlertsPerDay
  );
  await sendLocalNotification(content.title, content.body, "geofence-alerts", {
    type: "location-alert",
    listId: activeList?.listId,
    storeId: bestStore.id,
  });

  await notificationAnalytics.recordNotification(
    content.title,
    content.body,
    bestStore.id,
    eventId,
    { latitude, longitude },
    activeList?.listId
  );
  // Push the inactivity re-engagement nudge a full window forward
  notificationEngine.syncInactivityReminder().catch(console.error);

  dwellTimers.delete(bestStore.id);
  notifiedStores.set(bestStore.id, { lat: latitude, lon: longitude, timestamp: now });

  // 16. TRIGGER REBALANCE
  void geofenceManager.rebalanceGeofences(latitude, longitude);
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    // kCLErrorDomain Code=0 is kCLErrorLocationUnknown, common in simulator or brief GPS loss
    if ((error as any).code === 0 || error.message?.includes("kCLErrorDomain Code=0")) {
      console.warn("Background Location Warning: Location temporarily unknown (kCLErrorDomain Code=0)");
      return;
    }
    console.error("Background Location Error:", error);
    return;
  }
  if (!data) return;
  const { locations } = data as any;
  if (!locations || locations.length === 0) return;
  
  await processLocationUpdate(locations[0]);
});

/**
 * Reason the continuous background session should not run right now.
 * The session is the battery cost; it should only exist while a location
 * notification is actually possible. Saved-store native geofences are
 * independent of this and keep working while the session is off.
 */
const getTrackingBlockReason = async (
  settings: Awaited<ReturnType<typeof getSettingsFromStorage>>
): Promise<string | null> => {
  if (settings.savedStoresOnly) return "Saved Stores Only enabled";
  if (!settings.notificationsEnabled) return "notifications disabled";
  if (!settings.shoppingListReminders) return "location alerts disabled";
  if (!settings.remindWithoutList && !(await geoEngine.hasActiveShoppingList())) {
    return "no active shopping list";
  }
  return null;
};

/**
 * Syncs the continuous background location session with current app state:
 * starts it when a notification is possible, stops it when not. Safe to call
 * often (launch, foreground, settings/list changes) — it no-ops when the
 * session is already in the right state.
 *
 * `restart` forces a stop/start cycle of an already-running session. Used on
 * app foreground as the safety net for pausesUpdatesAutomatically: a session
 * iOS has auto-paused looks "started" to JS but delivers nothing until
 * restarted.
 */
export const startBackgroundLocationTracking = async (options?: { restart?: boolean }) => {
  try {
    const settings = await getSettingsFromStorage();
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

    const blockReason = await getTrackingBlockReason(settings);
    if (blockReason) {
      if (hasStarted) {
        await stopBackgroundLocationTracking();
        useDebugStore.getState().addDebugLog(`[Location] Background tracking stopped (${blockReason})`);
      }
      return;
    }

    if (hasStarted && !options?.restart) return;

    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status !== "granted") return;

    if (hasStarted) {
      // Restart cycle: clears a possible iOS auto-pause without touching
      // the in-memory dwell/anchor state.
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 300,
      showsBackgroundLocationIndicator: true,
      // Let iOS power down positioning while the user is stationary.
      // Auto-pause doesn't resume on its own; the foreground restart above
      // and saved-store geofence enters are the recovery paths.
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Fitness,
    });
    useDebugStore.getState().addDebugLog(
      `[Location] Background tracking ${hasStarted ? "restarted" : "started"}`
    );
  } catch (e) {
    console.warn("Failed to start background tracking (possibly denied mode fallback):", e);
  }
};

export const stopBackgroundLocationTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      
      // Verify that it actually stopped
      const isStillRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!isStillRunning) {
        useDebugStore.getState().addDebugLog("[Location] Background tracking successfully stopped");
      } else {
        useDebugStore.getState().addDebugLog("[Location] WARNING: Background tracking is still active after stop request");
      }
    }
    
    // Clean up background location memory state
    speedHistory = [];
    stopAnchor = null;
    geofenceState.clear();
    dwellTimers.clear();
    exitGraceTimers.clear();
    notifiedStores.clear();
  } catch (e) {
    console.warn("Failed to stop background tracking:", e);
  }
};

// getDistance moved to locationUtils.ts

/**
 * Handle a native geofence enter event.
 * Validates settings and dispatches notifications if conditions are met.
 */
export const handleGeofenceEnter = async (storeId: string) => {
  try {
    // 1. Memory lookup
    const store = geofenceManager.getStoreFromCache(storeId);
    if (!store) return; // Deleted

    // 2. Is Active?
    if (!store.isActive) return;

    // 3. Settings
    const settings = await getSettingsFromStorage();
    if (!settings.notificationsEnabled || !settings.shoppingListReminders) return;

    // 3.5 Session recovery: an enter event proves the user is moving, which
    // is when an auto-paused session (pausesUpdatesAutomatically) must come
    // back. No-ops or stops itself when tracking shouldn't run at all.
    void startBackgroundLocationTracking({ restart: true });

    // 4. Has Active List? (skipped when Remind Without a List is on)
    if (!settings.remindWithoutList) {
      const hasActiveList = await geoEngine.hasActiveShoppingList();
      if (!hasActiveList) return;
    }

    // 4.5 Wide-fence enter confirmation. The native fence is registered at
    // >=NATIVE_FENCE_MIN_RADIUS (iOS regions are unreliable below ~150m),
    // which is wider than the user's chosen alert distance — so an enter
    // event alone doesn't mean "genuinely close". Verify against the OS's
    // cached last-known fix (no GPS engagement) and only notify when the
    // user is within their alert distance (+ fix accuracy). iOS fires enter
    // once per crossing, so a rejected enter is a lost notification — the
    // accuracy margin keeps borderline fixes on the notify side, and no
    // usable fix -> fail open.
    const alertDistance = getAlertDistanceMeters(settings.notificationSensitivity);
    try {
      const fix = await Location.getLastKnownPositionAsync({
        maxAge: NOTIFICATION_CONSTANTS.NATIVE_CONFIRM_MAX_AGE_MS,
        requiredAccuracy: NOTIFICATION_CONSTANTS.MAX_GPS_ACCURACY,
      });
      if (fix) {
        const dist = getDistance(
          fix.coords.latitude,
          fix.coords.longitude,
          store.latitude,
          store.longitude
        );
        const margin = fix.coords.accuracy ?? 0;
        if (dist > alertDistance + margin) {
          useDebugStore.getState().addDebugLog(
            `[Geofence] Enter for ${store.name} outside alert distance (${dist.toFixed(0)}m > ${alertDistance}m + ${margin.toFixed(0)}m accuracy)`
          );
          return;
        }
      }
    } catch {
      // fail open
    }

    // 5. Active list + unpurchased items
    const activeList = await geoEngine.getActiveShoppingList();
    if ((!activeList || activeList.items.length === 0) && !settings.remindWithoutList) return;
    const unpurchasedItems = activeList?.items ?? [];

    // 6. Should Send?
    const eventId = Date.now();
    const schedule = resolveNotificationSchedule(settings);
    const decision = await notificationEngine.shouldSendLocationNotification({
      storeId: store.id,
      eventId,
      isPro: settings.isPro,
      maxAlertsPerDay: settings.maxAlertsPerDay,
      maxNotificationsPerStorePerDay: settings.maxNotificationsPerStorePerDay,
      allowedDays: schedule.allowedDays,
      allowedHoursStart: schedule.startHour,
      allowedHoursEnd: schedule.endHour,
      snoozeUntil: settings.snoozeUntil,
      shoppingListReminders: settings.shoppingListReminders,
      // Native enter events carry no user fix; the store position is within
      // the fence radius of the user, close enough for trip suppression.
      coords: { latitude: store.latitude, longitude: store.longitude },
    });
    if (!decision.allowed) return;

    // SEND
    const content = await notificationEngine.buildNotificationContent(
      store.name,
      unpurchasedItems,
      settings.isPro,
      settings.maxAlertsPerDay
    );
    await sendLocalNotification(content.title, content.body, 'geofence-alerts', {
      type: 'location-alert',
      listId: activeList?.listId,
      storeId: store.id,
    });
    await notificationAnalytics.recordNotification(
      content.title,
      content.body,
      store.id,
      eventId,
      { latitude: store.latitude, longitude: store.longitude },
      activeList?.listId
    );
    // Push the inactivity re-engagement nudge a full window forward
    notificationEngine.syncInactivityReminder().catch(console.error);


    // Record store visit for stats
    useStatsStore.getState().recordStoreVisit(store.id);
  } catch (e) {
    console.error("handleGeofenceEnter error", e);
  }
};
