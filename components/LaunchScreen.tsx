import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import AppLogo from "./AppLogo";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface LaunchScreenProps {
  onFinish: () => void;
}

export default function LaunchScreen({ onFinish }: LaunchScreenProps) {
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Logo is now instantly visible (initial values are 1).
    // We removed the text earlier, so we only need to fade out the screen quickly.

    // 2. Whole screen fades out after a short hold (e.g. 1200ms instead of 800ms)
    screenOpacity.value = withDelay(
      1200,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }]}));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }]}));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value}));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]} pointerEvents="none">
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require("../assets/images/launch-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    zIndex: 999},
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"},
  logoContainer: {
    marginBottom: 20
  },
  logo: {
    width: 240,
    height: 160
  },
  appName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: 0.3}});
