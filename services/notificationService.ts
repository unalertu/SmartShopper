/**
 * Notification service utilities.
 * Will be fully integrated with background geofencing later.
 */

import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { useSettingsStore } from "../store/useSettingsStore";

export const setupNotifications = async (): Promise<boolean> => {
  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const { soundEnabled } = useSettingsStore.getState();

      // While the app is in the foreground the OS banner is suppressed:
      // InAppNotificationBanner (fed by addNotificationReceivedListener)
      // presents the same payload in-app instead, so showing both would
      // duplicate the alert. Background/killed delivery is unchanged.
      const isForeground = AppState.currentState === "active";
      if (isForeground) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: soundEnabled,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });

  // Request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  // Android notification channels
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("geofence-alerts", {
      name: "Store Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0a7eff",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("shopping-reminders", {
      name: "Shopping Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  return true;
};

export const sendLocalNotification = async (
  title: string,
  body: string,
  channelId: string = "geofence-alerts",
  data?: Record<string, unknown>
): Promise<void> => {
  const { soundEnabled } = useSettingsStore.getState();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: soundEnabled ? "default" : undefined,
      ...(data && { data }),
      ...(Platform.OS === "android" && {
        channelId,
      }),
    },
    trigger: null, // Send immediately
  });
};
