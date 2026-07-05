import React, { useCallback, useRef } from 'react';
import { StyleSheet, InteractionManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate} from 'react-native-reanimated';
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
  const hasAnimated = useRef(false);
  const [isReady, setIsReady] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
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
        setIsReady(false);
        task.cancel();
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [8, 0])},
      ]};
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {isReady ? children : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1}});
