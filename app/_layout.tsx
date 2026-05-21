import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setupNotifications } from "@/services/notificationService";
import LaunchScreen from "@/components/LaunchScreen";
import NotificationPermissionScreen, {
  shouldShowNotificationPermission,
} from "@/components/NotificationPermissionScreen";

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

// Custom theme — overrides the default white background that shows during swipe-back gestures
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);

  useEffect(() => {
    // Hide native splash screen so custom launch screen takes over
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
  }, []);

  const handleLaunchFinish = useCallback(async () => {
    setShowLaunchScreen(false);

    // Check if we should show the notification pre-permission screen
    const shouldShow = await shouldShowNotificationPermission();
    if (shouldShow) {
      setShowNotificationPermission(true);
    } else {
      // Permission already handled — just ensure notifications are set up
      setupNotifications();
    }
  }, []);

  const handleNotificationPermissionComplete = useCallback(() => {
    setShowNotificationPermission(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : AppLightTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "ios_from_right",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animationDuration: 350,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-item"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                title: "Add Item",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="add-location"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                title: "Add Location",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="list/[id]"
              options={{
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false,
              }}
            />
          </Stack>
          <StatusBar style={showNotificationPermission ? "light" : "dark"} />
        </ThemeProvider>
      </BottomSheetModalProvider>

      {/* Notification Pre-Permission Screen (shown after launch, before app) */}
      {showNotificationPermission && (
        <NotificationPermissionScreen
          onComplete={handleNotificationPermissionComplete}
        />
      )}

      {/* Custom Animated Launch Screen */}
      {showLaunchScreen && <LaunchScreen onFinish={handleLaunchFinish} />}
    </GestureHandlerRootView>
  );
}
