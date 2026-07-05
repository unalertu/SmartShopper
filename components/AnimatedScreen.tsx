import React, { useCallback, useRef } from 'react';
import { StyleSheet, InteractionManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

interface AnimatedScreenProps {
  children: React.ReactNode;
  style?: any;
}

/**
 * Cal AI-style animated screen wrapper.
 * Applies a subtle fade + micro-scale entrance animation
 * the first time the tab gains focus.
 */
export default function AnimatedScreen({ children, style }: AnimatedScreenProps) {
  const progress = useSharedValue(0);
  const hasAnimated = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (!hasAnimated.current) {
          progress.value = 0;
          progress.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic)
          });
          hasAnimated.current = true;
        }
      });
      
      return () => {
        task.cancel();
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [8, 0])
        },
      ]
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
    flex: 1
  }
});
