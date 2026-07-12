/**
 * In-app banner for notifications delivered while the app is in the
 * foreground. The OS banner is suppressed in that state (see
 * setupNotifications), so this is the foreground half of the same alert:
 * it renders the exact notification payload (title/body/data) and its tap
 * deep-links to the shopping list under the same rules as tapping the OS
 * notification.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { MapPin, ShoppingBag } from "lucide-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { hapticNotification } from "../services/haptics";
import { useSettingsStore } from "../store/useSettingsStore";
import { openNotificationList } from "../utils/notificationDeepLink";

const AUTO_DISMISS_MS = 5000;

interface BannerNotification {
  /** Notification request identifier; keys the view so a newer alert replaces the current one */
  id: string;
  title: string;
  body: string;
  listId: number | null;
  isLocationAlert: boolean;
}

export default function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notification, setNotification] = useState<BannerNotification | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Fires only when a notification is delivered while the app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener((event) => {
      // Never overlay onboarding
      if (!useSettingsStore.getState().hasCompletedOnboarding) return;

      const content = event.request.content;
      const data = content.data as Record<string, unknown> | null | undefined;
      const listId = Number(data?.listId);

      hapticNotification();
      setNotification({
        id: event.request.identifier,
        title: content.title ?? "",
        body: content.body ?? "",
        listId: Number.isFinite(listId) ? listId : null,
        isLocationAlert: data?.type === "location-alert" || data?.storeId != null,
      });
    });
    return () => subscription.remove();
  }, []);

  // Auto-dismiss; the timer resets when a newer notification replaces the banner
  useEffect(() => {
    if (!notification) return;
    dismissTimerRef.current = setTimeout(() => setNotification(null), AUTO_DISMISS_MS);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [notification]);

  const handlePress = useCallback(() => {
    if (!notification) return;
    const { listId } = notification;
    setNotification(null);

    // Identical routing to an OS notification tap
    if (listId === null) return;
    openNotificationList(router, listId);
  }, [notification, router]);

  if (!notification) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 8,
        zIndex: 1000,
      }}
    >
      <Animated.View
        key={notification.id}
        entering={FadeInUp.duration(350).springify()}
        exiting={FadeOutUp.duration(250)}
        className="mx-4"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          className="flex-row items-center bg-white border border-slate-100 rounded-3xl p-4"
          style={{
            shadowColor: "#0f172a",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <View
            style={{
              backgroundColor: notification.isLocationAlert
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(59, 130, 246, 0.1)",
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {notification.isLocationAlert ? (
              <MapPin size={20} color="#22c55e" />
            ) : (
              <ShoppingBag size={20} color="#3b82f6" />
            )}
          </View>
          <View className="ml-3 flex-shrink flex-1">
            <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
              {notification.title}
            </Text>
            <Text className="text-[12px] text-slate-400 mt-0.5" numberOfLines={2}>
              {notification.body}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
