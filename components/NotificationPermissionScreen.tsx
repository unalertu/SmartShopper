import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
  SharedValue} from "react-native-reanimated";
import { Bell, MapPin, ListChecks, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

const { width, height } = Dimensions.get("window");
const STORAGE_KEY = "notification_permission_shown";

// ── Spring configs ──
const SPRING_SNAPPY = { damping: 18, stiffness: 280, mass: 0.6 };
const SPRING_GENTLE = { damping: 22, stiffness: 180, mass: 0.8 };

interface NotificationPermissionScreenProps {
  onComplete: () => void;
}

// ── Benefit Row ──
function BenefitRow({
  Icon,
  title,
  delay,
  rowProgress}: {
  Icon: any;
  title: string;
  delay: number;
  rowProgress: SharedValue<number>;
}) {
  const itemProgress = useSharedValue(0);

  useEffect(() => {
    itemProgress.value = withDelay(
      delay,
      withSpring(1, SPRING_GENTLE)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(itemProgress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(itemProgress.value, [0, 1], [16, 0]) },
      { scale: interpolate(itemProgress.value, [0, 1], [0.92, 1]) },
    ]}));

  return (
    <Animated.View style={[styles.benefitRow, animatedStyle]}>
      <View style={styles.benefitIconContainer}>
        <Icon size={20} color={Colors.white} strokeWidth={2} />
      </View>
      <Text style={styles.benefitText}>{title}</Text>
    </Animated.View>
  );
}

export default function NotificationPermissionScreen({
  onComplete}: NotificationPermissionScreenProps) {
  // ── Animation values ──
  const screenOpacity = useSharedValue(0);
  const bellScale = useSharedValue(0.3);
  const bellOpacity = useSharedValue(0);
  const bellRing = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(14);
  const benefitsProgress = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(24);
  const secondaryOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    // Screen fade-in
    screenOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic)});

    // Bell icon: scale up with bounce
    bellOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    bellScale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 })
    );

    // Glow pulse behind the bell
    glowOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );

    // Bell ring animation (subtle rotation)
    bellRing.value = withDelay(
      700,
      withSequence(
        withTiming(15, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(-12, { duration: 100, easing: Easing.inOut(Easing.cubic) }),
        withTiming(8, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-5, { duration: 80, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) })
      )
    );

    // Title
    titleOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    titleTranslateY.value = withDelay(
      500,
      withSpring(0, SPRING_GENTLE)
    );

    // Subtitle
    subtitleOpacity.value = withDelay(
      650,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    subtitleTranslateY.value = withDelay(
      650,
      withSpring(0, SPRING_GENTLE)
    );

    // Benefits
    benefitsProgress.value = withDelay(
      800,
      withTiming(1, { duration: 400 })
    );

    // CTA
    ctaOpacity.value = withDelay(
      1100,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    ctaTranslateY.value = withDelay(
      1100,
      withSpring(0, SPRING_GENTLE)
    );

    // Secondary button
    secondaryOpacity.value = withDelay(
      1250,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // Footer
    footerOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );

    // Haptic feedback on mount
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Handlers ──
  const dismissScreen = useCallback(() => {
    exitOpacity.value = withTiming(
      0,
      { duration: 350, easing: Easing.in(Easing.cubic) },
      () => {
        runOnJS(onComplete)();
      }
    );
  }, [onComplete]);

  const handleEnable = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark as shown
    await AsyncStorage.setItem(STORAGE_KEY, "true");

    // Trigger native iOS permission popup
    await Notifications.requestPermissionsAsync();

    // Setup notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true})});

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("geofence-alerts", {
        name: "Store Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0a7eff",
        sound: "default"});
    }

    dismissScreen();
  }, [dismissScreen]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    dismissScreen();
  }, [dismissScreen]);

  // ── Animated styles ──
  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value * exitOpacity.value}));

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bellOpacity.value,
    transform: [
      { scale: bellScale.value },
      { rotate: `${bellRing.value}deg` },
    ]}));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowOpacity.value, [0, 1], [0, 0.5]),
    transform: [{ scale: interpolate(glowOpacity.value, [0, 1], [0.6, 1]) }]}));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]}));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }]}));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }]}));

  const secondaryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: secondaryOpacity.value}));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value}));

  // ── CTA press scale animation ──
  const ctaScale = useSharedValue(1);
  const ctaScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }]}));

  const handleCtaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.96, SPRING_SNAPPY);
  }, []);

  const handleCtaPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, SPRING_SNAPPY);
  }, []);

  // ── Benefits data ──
  const benefits = [
    { Icon: ListChecks, title: "Never forget your shopping list", delay: 850 },
    { Icon: MapPin, title: "Get notified near saved stores", delay: 950 },
    { Icon: Sparkles, title: "Smart reminders for lists & shops", delay: 1050 },
  ];

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <View style={styles.content}>
        {/* ── Top Section: Icon + Text ── */}
        <View style={styles.topSection}>
          {/* Bell Icon with Glow */}
          <View style={styles.bellWrapper}>
            <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />
            <Animated.View style={[styles.bellContainer, bellAnimatedStyle]}>
              <Bell size={36} color={Colors.white} strokeWidth={1.8} />
            </Animated.View>
          </View>

          {/* Title */}
          <Animated.Text style={[styles.title, titleAnimatedStyle]}>
            Stay in the loop
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            Get gentle reminders that help you shop smarter — right when you need them.
          </Animated.Text>
        </View>

        {/* ── Benefits ── */}
        <View style={styles.benefitsContainer}>
          {benefits.map((benefit, index) => (
            <BenefitRow
              key={index}
              Icon={benefit.Icon}
              title={benefit.title}
              delay={benefit.delay}
              rowProgress={benefitsProgress}
            />
          ))}
        </View>

        {/* ── Bottom Section: CTAs ── */}
        <View style={styles.bottomSection}>
          {/* Primary CTA */}
          <Animated.View style={[ctaAnimatedStyle, ctaScaleStyle]}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleEnable}
              onPressIn={handleCtaPressIn}
              onPressOut={handleCtaPressOut}
            >
              <Bell size={18} color={Colors.surface[900]} strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>Enable Notifications</Text>
            </Pressable>
          </Animated.View>

          {/* Secondary option */}
          <Animated.View style={secondaryAnimatedStyle}>
            <Pressable style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </Pressable>
          </Animated.View>

          {/* Footer note */}
          <Animated.Text style={[styles.footerNote, footerAnimatedStyle]}>
            You can change this anytime in Settings
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Utility: check if we should show the pre-permission screen ──
export async function shouldShowNotificationPermission(): Promise<boolean> {
  try {
    const shown = await AsyncStorage.getItem(STORAGE_KEY);
    if (shown === "true") return false;

    // Also check if permission is already granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface[900],
    zIndex: 998},
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: height * 0.12,
    paddingBottom: height * 0.06},

  // ── Top Section ──
  topSection: {
    alignItems: "center"},
  bellWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32},
  glowRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[500]},
  bellContainer: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"},
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12},
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
    letterSpacing: 0.1},

  // ── Benefits ──
  benefitsContainer: {
    gap: 14,
    paddingHorizontal: 4},
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)"},
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14},
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.15},

  // ── Bottom Section ──
  bottomSection: {
    alignItems: "center",
    gap: 6},
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 32,
    width: "100%",
    gap: 10},
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.surface[900],
    letterSpacing: -0.2},
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24},
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 0.1},
  footerNote: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.25)",
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 4}});
