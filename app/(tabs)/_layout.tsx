import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import {
  Home,
  MapPin,
  Menu,
  Settings,
  Plus,
  X,
  PlusCircle,
  CheckCircle,
  ScanBarcode,
} from "lucide-react-native";
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
  settings: { label: "Settings", Icon: Settings },
};

// ── Animated Tab Item ──
function TabItem({
  routeKey,
  routeName,
  isFocused,
  Icon,
  label,
  onPress,
}: {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  Icon: any;
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withSpring(isFocused ? 1 : 0, SPRING_GENTLE);
  }, [isFocused]);

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: `rgba(255, 255, 255, ${interpolate(activeProgress.value, [0, 1], [0, 0.75])})`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: interpolate(activeProgress.value, [0, 1], [0, 0.06]),
    shadowRadius: 3,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0.7, 1]),
    transform: [{ translateY: interpolate(activeProgress.value, [0, 1], [0.5, 0]) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scale: activeProgress.value }],
  }));

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
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconContainer, iconContainerStyle]}>
        <Icon
          size={20}
          color={isFocused ? "#0f172a" : "#94a3b8"}
          strokeWidth={isFocused ? 2.4 : 1.8}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: isFocused ? "#0f172a" : "#94a3b8" },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </Pressable>
  );
}

// ── Animated FAB ──
function FloatingActionButton({
  isOpen,
  onPress,
}: {
  isOpen: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isOpen ? 1 : 0, SPRING_CONFIG);
  }, [isOpen]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 135])}deg` },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, SPRING_CONFIG);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.fab}
    >
      <Animated.View style={iconStyle}>
        <Plus size={18} color="#fff" strokeWidth={2.5} />
      </Animated.View>
    </Pressable>
  );
}

// ── Animated Action Card ──
function ActionCard({
  icon: IconComponent,
  label,
  onPress,
  delay,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  delay: number;
}) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING_CONFIG);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.actionCard, cardStyle]}>
        <View style={styles.actionIconWrap}>
          <IconComponent size={22} color="#0f172a" strokeWidth={2} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Custom Tab Bar ──
function CustomTabBar({
  state,
  navigation,
  insets,
  isActionsMenuOpen,
  setIsActionsMenuOpen,
}: BottomTabBarProps & {
  insets: any;
  isActionsMenuOpen: boolean;
  setIsActionsMenuOpen: (val: boolean) => void;
}) {
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    overlayOpacity.value = withTiming(isActionsMenuOpen ? 1 : 0, { duration: 250 });
  }, [isActionsMenuOpen]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: isActionsMenuOpen ? "auto" : "none",
  }));

  const actions = [
    { icon: PlusCircle, label: "New List", key: "new-list" },
    { icon: MapPin, label: "Add\nLocation", key: "add-loc" },
    { icon: CheckCircle, label: "Quick Add", key: "quick-add" },
    { icon: ScanBarcode, label: "Scan Item", key: "scan" },
  ];

  return (
    <>
      {/* Actions Menu Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView
          intensity={25}
          tint="dark"
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setIsActionsMenuOpen(false)}
          />
        </BlurView>

        <View style={styles.actionsGrid}>
          {actions.map((action, i) => (
            <ActionCard
              key={action.key}
              icon={action.icon}
              label={action.label}
              delay={i * 50}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsActionsMenuOpen(false);
              }}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Navigation Bar Container ── */}
      <View
        style={[
          styles.bottomContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom - 12 : 6 },
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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}

            {/* Floating Action Button */}
            <FloatingActionButton
              isOpen={isActionsMenuOpen}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsActionsMenuOpen(!isActionsMenuOpen);
              }}
            />
          </View>
        </Pressable>
      </View>
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
    zIndex: 50,
  },
  navBarBlur: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 50,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 15,
  },
  navBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 6,
    paddingRight: 5,
    paddingVertical: 4,
    borderRadius: 50,
  },

  // Tab item
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconContainer: {
    width: 40,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    letterSpacing: 0.15,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0f172a",
    marginTop: 2,
  },

  // FAB
  fab: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  // Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 100,
  },

  // Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 40,
    gap: 14,
  },
  actionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    width: 100,
    height: 100,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 14,
  },
});

// ── Tab Layout ──
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          insets={insets}
          isActionsMenuOpen={isActionsMenuOpen}
          setIsActionsMenuOpen={setIsActionsMenuOpen}
        />
      )}
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => <GradientBlurBackground />,
        sceneStyle: { backgroundColor: '#f8fafc' },
        headerTitle: '',
        headerStyle: { height: 110 },
      }}
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
