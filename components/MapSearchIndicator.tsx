import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MapSearchIndicatorProps {
  /**
   * Whether the indicator should be visible or hidden.
   * Driven by the useMapSearch hook's isSearching state.
   */
  isVisible: boolean;
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MapSearchIndicator({ isVisible }: MapSearchIndicatorProps) {
  const insets = useSafeAreaInsets();
  
  // Shared values for react-native-reanimated
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20); // Starts slightly above for a drop-in effect

  const showTimestamp = useRef<number>(0);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      showTimestamp.current = Date.now();

      // Fade in and slide down
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      const hideAnimation = () => {
        // Fade out and slide up
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        });
        translateY.value = withTiming(-20, {
          duration: 300,
          easing: Easing.in(Easing.ease),
        });
      };

      const timeVisible = Date.now() - showTimestamp.current;
      const MIN_VISIBLE_TIME = 1000; // Force it to show for at least 1 second

      if (timeVisible < MIN_VISIBLE_TIME && showTimestamp.current > 0) {
        hideTimeout.current = setTimeout(hideAnimation, MIN_VISIBLE_TIME - timeVisible);
      } else {
        hideAnimation();
      }
    }

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [isVisible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
      // Ignore touch events when hidden to not block the map
      pointerEvents: opacity.value === 0 ? 'none' : 'auto',
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: Math.max(insets.top, 20) + 10, // Dynamic top padding below notch
          alignSelf: 'center',
          zIndex: 50,
          // Premium shadow
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        animatedStyle,
      ]}
    >
      <View className="flex-row items-center bg-white/95 px-5 py-3 rounded-full border border-gray-100">
        <ActivityIndicator size="small" color="#3b82f6" className="mr-3" />
        <Text className="text-gray-700 font-medium text-sm tracking-wide">
          Searching this area...
        </Text>
      </View>
    </Animated.View>
  );
}
