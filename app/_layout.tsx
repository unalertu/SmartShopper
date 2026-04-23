import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setupNotifications } from "@/services/notificationService";

// Prevent splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Setup notifications on app mount
    setupNotifications();
    
    // Hide splash screen safely to prevent UI thread crashes
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
