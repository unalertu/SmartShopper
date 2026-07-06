import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { enableFreeze } from "react-native-screens";
import Purchases from 'react-native-purchases';
import { Platform, AppState } from 'react-native';

enableFreeze(false);

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setupNotifications } from "@/services/notificationService";
import LaunchScreen from "@/components/LaunchScreen";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useShoppingListStore } from "@/store/useShoppingListStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { notificationEngine } from "@/services/notificationEngine";
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from "@/services/locationService";
import { geofenceManager } from "@/services/geofenceManager";
import { getAlertDistanceMeters } from "@/constants";

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
  const router = useRouter();
  const _hasHydrated = useSettingsStore((state) => state._hasHydrated);
  const savedStoresOnly = useSettingsStore((state) => state.savedStoresOnly);

  // Dynamically start/stop background location tracking based on savedStoresOnly setting
  useEffect(() => {
    if (!_hasHydrated) return;
    if (savedStoresOnly) {
      void stopBackgroundLocationTracking();
      void geofenceManager.syncSavedStores(getAlertDistanceMeters(useSettingsStore.getState().notificationSensitivity));
    } else {
      void startBackgroundLocationTracking();
      void geofenceManager.syncSavedStores(getAlertDistanceMeters(useSettingsStore.getState().notificationSensitivity));
    }
  }, [savedStoresOnly, _hasHydrated]);

  useEffect(() => {
    if (_hasHydrated) {
      // Check if we need to show onboarding and redirect immediately
      // This happens behind the LaunchScreen, preventing any flashes
      const hasCompletedOnboarding = useSettingsStore.getState().hasCompletedOnboarding;
      if (!hasCompletedOnboarding) {
        setTimeout(() => {
          router.replace('/onboarding');
        }, 0);
      }

      // Hide native splash screen so custom launch screen takes over
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 100);
    }
  }, [_hasHydrated]);

  // Foreground sync for geofences
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void geofenceManager.syncSavedStores(getAlertDistanceMeters(useSettingsStore.getState().notificationSensitivity));
      }
    });
    return () => subscription.remove();
  }, []);

  // Initialize RevenueCat
  useEffect(() => {
    let isMounted = true;
    const setupPurchases = async () => {
      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        const appleKey = 'test_ekQnmmklJNsRbinvPyXIYfVBPBJ'; // Sizin verdiğiniz test anahtarı
        const googleKey = 'test_ekQnmmklJNsRbinvPyXIYfVBPBJ'; // Android için de şimdilik aynısını koyduk
        
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: appleKey });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: googleKey });
        }

        // 1. Initial check on startup
        const customerInfo = await Purchases.getCustomerInfo();
        // Force Pro plan
        const hasPro = true; // !!customerInfo?.entitlements?.active?.['pro'];
        if (isMounted) {
          useSettingsStore.getState().setIsPro(hasPro);
        }
      } catch (e) {
        console.warn('Error configuring Purchases:', e);
      }
    };
    
    setupPurchases();

    // 2. Add listener for background changes / future purchases
    const listener = (customerInfo: any) => {
      // Force Pro plan
      const hasPro = true; // !!customerInfo?.entitlements?.active?.['pro'];
      useSettingsStore.getState().setIsPro(hasPro);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      isMounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

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

  // Subscribe to shopping list changes for unfinished and empty list reminders
  useEffect(() => {
    if (!_hasHydrated) return;
    const unsubscribe = useShoppingListStore.subscribe((state, prevState) => {
      if (state.items !== prevState.items) {
        notificationEngine.syncUnfinishedListReminder().catch(console.error);
        notificationEngine.syncEmptyListReminder().catch(console.error);
      }
    });
    return unsubscribe;
  }, [_hasHydrated]);

  const handleLaunchFinish = useCallback(async () => {
    setShowLaunchScreen(false);

    // If onboarding is going to be shown, we just stop here
    // as we don't need to sync locations/notifications yet.
    const hasCompletedOnboarding = useSettingsStore.getState().hasCompletedOnboarding;
    if (!hasCompletedOnboarding) {
      return;
    }

    try {
      // Sync notifications from analytics to Zustand
      await useNotificationsStore.getState().syncFromAnalytics();
      
      // Sync saved store native geofences first
      await geofenceManager.syncSavedStores(getAlertDistanceMeters(useSettingsStore.getState().notificationSensitivity));

      // Attempt to start background location tracking for unsaved discovery pipeline
      await startBackgroundLocationTracking();
    } catch (e) {
      console.warn('Error during launch sync:', e);
    }

    // Ensure notifications are set up
    setupNotifications();
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
              // especially when the previous screen contains heavy components like MapView.
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
              name="onboarding"
              options={{
                animation: "fade",
                gestureEnabled: false,
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
            <Stack.Screen
              name="purchase-success"
              options={{
                animation: "fade",
                gestureEnabled: false,
                headerShown: false}}
            />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </BottomSheetModalProvider>

      {/* Custom Animated Launch Screen */}
      {showLaunchScreen && <LaunchScreen onFinish={handleLaunchFinish} />}
    </GestureHandlerRootView>
  );
}
