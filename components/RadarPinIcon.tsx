import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { MapPin } from 'lucide-react-native';

interface RadarPinIconProps {
  size?: number;
  pinColor?: string;
  pulseColor?: string;
  active?: boolean;
}

/**
 * A location pin icon surrounded by animated radar-like pulse rings.
 * Creates a sense of active, real-time detection.
 */
export default function RadarPinIcon({
  size = 28,
  pinColor = '#334155',
  pulseColor = '#3b82f6',
  active = true,
}: RadarPinIconProps) {
  // Each ring gets its own shared value for staggered pulses
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    const duration = 2400;
    const easing = Easing.out(Easing.ease);

    ring1.value = 0;
    ring1.value = withRepeat(
      withTiming(1, { duration, easing }),
      -1, // infinite
      false,
    );

    ring2.value = 0;
    ring2.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration, easing }),
        -1,
        false,
      ),
    );

    ring3.value = 0;
    ring3.value = withDelay(
      1600,
      withRepeat(
        withTiming(1, { duration, easing }),
        -1,
        false,
      ),
    );
  }, [active]);

  const containerSize = size * 1.5;
  const maxRingSize = containerSize;

  const useRingStyle = (progress: SharedValue<number>) =>
    useAnimatedStyle(() => {
      const scale = interpolate(progress.value, [0, 1], [0.3, 1]);
      const opacity = interpolate(progress.value, [0, 0.2, 1], [0, 0.35, 0]);

      return {
        position: 'absolute' as const,
        width: maxRingSize,
        height: maxRingSize,
        borderRadius: maxRingSize / 2,
        borderWidth: 1.5,
        borderColor: pulseColor,
        backgroundColor: 'transparent',
        transform: [{ scale }],
        opacity,
      };
    });

  const ring1Style = useRingStyle(ring1);
  const ring2Style = useRingStyle(ring2);
  const ring3Style = useRingStyle(ring3);

  return (
    <View
      style={[
        styles.container,
        { width: containerSize, height: containerSize },
      ]}
    >
      {/* Pulse rings */}
      {active && (
        <>
          <Animated.View style={ring1Style} />
          <Animated.View style={ring2Style} />
          <Animated.View style={ring3Style} />
        </>
      )}

      {/* Subtle static glow behind the pin */}
      <View
        style={[
          styles.glow,
          {
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size * 0.45,
            backgroundColor: pulseColor,
            opacity: active ? 0.12 : 0,
          },
        ]}
      />

      {/* The pin icon itself */}
      <MapPin size={size} color={pinColor} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
