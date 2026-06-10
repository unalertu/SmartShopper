import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnUI,
  Easing} from "react-native-reanimated";
import { tabBarScrollY, resetTabBarScroll } from '../../hooks/useTabBarScroll';
import {
  Home,
  MapPin,
  Menu,
  Settings,
  Plus,
  X,
  PlusCircle,
  CheckCircle,
  ScanBarcode} from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import GradientBlurBackground from "../../components/GradientBlurBackground";

// ── Spring configs ──
const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.6 };
const SPRING_GENTLE = { damping: 18, stiffness: 200, mass: 0.5 };

// ── Tab config ──
const TAB_CONFIG: Record<string, { label: string; Icon: any }> = {
  index:   { label: "Home",     Icon: Home },
  stores:  { label: "Shops",    Icon: MapPin },
  lists:   { label: "Lists",    Icon: Menu },
  settings: { label: "Settings", Icon: Settings }};

// ── Animated Tab Item ──
function TabItem({
  routeKey,
  routeName,
  isFocused,
  Icon,
  label,
  onPress,
  onLayout}: {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  Icon: any;
  label: string;
  onPress: () => void;
  onLayout?: (e: any) => void;
}) {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withSpring(isFocused ? 1 : 0, SPRING_GENTLE);
  }, [isFocused]);

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value}));
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value}));
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]}));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, SPRING_CONFIG);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  return (
    <Pressable
      key={routeKey}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconContainer, containerStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, inactiveIconStyle]}>
          <Icon size={19} color="#b0b8c4" strokeWidth={1.5} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, activeIconStyle]}>
          <Icon size={19} color="#ffffff" strokeWidth={2.2} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ── Custom Tab Bar ──
function CustomTabBar({
  state,
  navigation,
  insets}: BottomTabBarProps & {
  insets: any;
}) {
  const [tabDimensions, setTabDimensions] = useState<{ x: number; width: number }[]>([]);

  const handleTabLayout = (index: number, event: any) => {
    const { x, width } = event.nativeEvent.layout;
    setTabDimensions((prev) => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Reset scrollY when switching tabs
  useEffect(() => {
    runOnUI(resetTabBarScroll)();
  }, [state.index]);

  useEffect(() => {
    if (tabDimensions[state.index]) {
      indicatorX.value = withSpring(tabDimensions[state.index].x, SPRING_GENTLE);
      indicatorWidth.value = withSpring(tabDimensions[state.index].width, SPRING_GENTLE);
    }
  }, [state.index, tabDimensions]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value}));

  // ── Scroll-reactive animated style ──
  const scrollAnimatedStyle = useAnimatedStyle(() => {
    const scrollY = tabBarScrollY.value;
    return {
      transform: [
        { scale: interpolate(scrollY, [0, 150], [1, 0.92], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(scrollY, [0, 150], [1, 0.9], Extrapolation.CLAMP),
    };
  });

  return (
    <>
      {/* ── Navigation Bar Container ── */}
      <Animated.View
        style={[
          styles.bottomContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom - 12 : 6 },
          scrollAnimatedStyle,
        ]}
        pointerEvents="box-none"
      >
        {/* Dead zone for empty spaces (margins & safe areas) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          pointerEvents="auto"
          accessible={false}
        />

        {/* Inner floating pill bar */}
        <Pressable
          style={styles.navBarBlur}
          pointerEvents="auto"
          onPress={() => {}}
          accessible={false}
        >
          <View style={styles.navBarInner}>
            {/* Liquid Sliding Indicator */}
            {tabDimensions.length > 0 && (
              <Animated.View style={[styles.slidingIndicator, indicatorStyle]} />
            )}

            {state.routes.map((route, index) => {
              const config = TAB_CONFIG[route.name];
              if (!config) return null;

              const isFocused = state.index === index;
              const { Icon, label } = config;

              return (
                <TabItem
                  key={route.key}
                  routeKey={route.key}
                  routeName={route.name}
                  isFocused={isFocused}
                  Icon={Icon}
                  label={label}
                  onLayout={(e) => handleTabLayout(index, e)}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true});
                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  // Nav bar
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50},
  navBarBlur: {
    marginHorizontal: 24,
    marginBottom: 4,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#0a0f1e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28},
  navBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 50},

  // Sliding Indicator
  slidingIndicator: {
    position: "absolute",
    top: 5,
    bottom: 5,
    left: 0,
    backgroundColor: "#0f172a",
    borderRadius: 22,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.40,
    shadowRadius: 12},

  // Tab item
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6},
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"}});

// ── Tab Layout ──
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          insets={insets}
        />
      )}
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => <GradientBlurBackground />,
        sceneStyle: { backgroundColor: '#F2F2F7' },
        headerTitle: '',
        headerStyle: { height: 85 },
        freezeOnBlur: false,
        unmountOnBlur: false}}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="stores" options={{ title: "Shops", headerShown: false }} />
      <Tabs.Screen name="lists" options={{ title: "Lists" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="locations" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
