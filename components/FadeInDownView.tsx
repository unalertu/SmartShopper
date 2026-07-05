import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';

interface Props extends React.ComponentProps<typeof Animated.View> {
  delay?: number;
  duration?: number;
}

export default function FadeInDownView({ children, delay = 0, duration = 400, style, ...props }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, { duration, damping: 20, stiffness: 100 }));
    translateY.value = withDelay(delay, withSpring(0, { duration, damping: 20, stiffness: 100 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}
