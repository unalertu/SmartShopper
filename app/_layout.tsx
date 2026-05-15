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

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);

  useEffect(() => {
    // Setup notifications on app mount
    setupNotifications();
    
    // Hide native splash screen so custom launch screen takes over
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
  }, []);

  const handleLaunchFinish = useCallback(() => {
    setShowLaunchScreen(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-item"
              options={{
                presentation: "modal",
                title: "Add Item",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="add-location"
              options={{
                presentation: "modal",
                title: "Add Location",
                headerShown: false,
              }}
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
