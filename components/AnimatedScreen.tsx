import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

interface AnimatedScreenProps {
  children: React.ReactNode;
  style?: any;
}

/**
 * Cal AI-style animated screen wrapper.
 * Applies a subtle fade + micro-scale entrance animation
 * every time the tab gains focus — creating a premium,
 * fluid feel between tab switches.
 */
export default function AnimatedScreen({ children, style }: AnimatedScreenProps) {
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      // Reset to initial state
      progress.value = 0;

      // Animate in with spring physics (Cal AI feel)
      progress.value = withSpring(1, {
        damping: 20,
        stiffness: 90,
        mass: 0.8,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      return () => {
        // Subtle fade out when leaving
        progress.value = withTiming(0, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        });
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [8, 0]),
        },
        {
          scale: interpolate(progress.value, [0, 1], [0.98, 1]),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
