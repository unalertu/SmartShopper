import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { enableFreeze } from "react-native-screens";

enableFreeze(false);

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setupNotifications } from "@/services/notificationService";
import LaunchScreen from "@/components/LaunchScreen";
import NotificationPermissionScreen, {
  shouldShowNotificationPermission} from "@/components/NotificationPermissionScreen";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useShoppingListStore } from "@/store/useShoppingListStore";
import { notificationEngine } from "@/services/notificationEngine";
import { startBackgroundLocationTracking } from "@/services/locationService";

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Custom theme — overrides the default white background that shows during swipe-back gestures
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F2F2F7'}};

export const unstable_settings = {
  anchor: "(tabs)"};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const _hasHydrated = useSettingsStore((state) => state._hasHydrated);

  useEffect(() => {
    // Hide native splash screen so custom launch screen takes over
    if (_hasHydrated) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 100);
    }
  }, [_hasHydrated]);

  // Auto-delete purchased items older than 7 days when the setting is enabled
  useEffect(() => {
    const { autoDeletePurchased } = useSettingsStore.getState();
    if (!autoDeletePurchased) return;

    const { items } = useShoppingListStore.getState();
    const now = Date.now();
    const expiredIds = items
      .filter((item) => item.isPurchased && now - item.createdAt > SEVEN_DAYS_MS)
      .map((item) => item.id);

    if (expiredIds.length > 0) {
      useShoppingListStore.setState((state) => ({
        items: state.items.filter((item) => !expiredIds.includes(item.id))}));
    }
  }, []);

  const handleLaunchFinish = useCallback(async () => {
    setShowLaunchScreen(false);

    // Check and send welcome notification safely (persisted check)
    await notificationEngine.checkAndSendWelcome();
    
    // Attempt to start background location tracking
    await startBackgroundLocationTracking();

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

  // Ensure the Root Layout only renders when Zustand is fully hydrated
  if (!_hasHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : AppLightTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "ios_from_right",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animationDuration: 350,
              // Prevent previous screen from being detached/unmounted during navigation.
              // This avoids the blank/white screen flash during swipe-back gestures,
              // especially when the previous screen contains heavy components like MapView.
              detachPreviousScreen: false}}
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
                headerShown: false}}
            />
            <Stack.Screen
              name="add-location"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                title: "Add Location",
                headerShown: false}}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: "transparentModal",
                animation: "fade",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false}}
            />
            <Stack.Screen
              name="pro"
              options={{
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false}}
            />
            <Stack.Screen
              name="list/[id]"
              options={{
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false}}
            />
            <Stack.Screen
              name="notifications"
              options={{
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false}}
            />
            <Stack.Screen
              name="notification-preferences"
              options={{
                animation: "ios_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                headerShown: false}}
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
