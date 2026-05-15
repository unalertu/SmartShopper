import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface LaunchScreenProps {
  onFinish: () => void;
}

export default function LaunchScreen({ onFinish }: LaunchScreenProps) {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Logo fades in and scales up
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.back(1.2)),
    });

    // 2. Text fades in and slides up (after logo)
    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );

    // 3. Whole screen fades out after holding
    screenOpacity.value = withDelay(
      1800,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require("../assets/images/app-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.appName}>SmartShopper</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    zIndex: 999,
    elevation: 999,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: 0.3,
  },
});
