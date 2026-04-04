/**
 * Notification service utilities.
 * Will be fully integrated with background geofencing later.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const setupNotifications = async (): Promise<boolean> => {
  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
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

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("geofence-alerts", {
      name: "Store Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0a7eff",
      sound: "default",
    });
  }

  return true;
};

export const sendLocalNotification = async (
  title: string,
  body: string
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      ...(Platform.OS === "android" && {
        channelId: "geofence-alerts",
      }),
    },
    trigger: null, // Send immediately
  });
};
