import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';

interface MapSearchIndicatorProps {
  /**
   * Whether the indicator should be visible or hidden.
   * Driven by the useMapSearch hook's isSearching state.
   */
  isVisible: boolean;
  /**
   * Optional text shown in place of the spinner (e.g. "Zoom in to see shops").
   */
  hint?: string;
  /**
   * Device has no connectivity: shows a "No connection" state instead of the
   * spinner so the failure reads as a network problem, not an app problem.
   * Takes precedence over the spinner and hint.
   */
  offline?: boolean;
}

export function MapSearchIndicator({ isVisible, hint, offline }: MapSearchIndicatorProps) {
  const insets = useSafeAreaInsets();
  
  // Shared values for react-native-reanimated
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20); // Starts slightly above for a drop-in effect

  const showTimestamp = useRef<number>(0);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      showTimestamp.current = Date.now();

      // Fade in and slide down
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease)});
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease)});
    } else {
      const hideAnimation = () => {
        // Fade out and slide up
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.in(Easing.ease)});
        translateY.value = withTiming(-20, {
          duration: 300,
          easing: Easing.in(Easing.ease)});
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
      pointerEvents: opacity.value === 0 ? 'none' : 'auto'};
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: Math.max(insets.top, 20),
          alignSelf: 'center',
          zIndex: 50},
        animatedStyle,
      ]}
    >
      <View style={[indicatorStyles.pill, (offline || hint) ? indicatorStyles.hintPill : null]}>
        {offline ? (
          <>
            <WifiOff size={15} color="#64748b" strokeWidth={2.2} />
            <Text style={[indicatorStyles.hintText, indicatorStyles.offlineText]}>No connection</Text>
          </>
        ) : hint ? (
          <Text style={indicatorStyles.hintText}>{hint}</Text>
        ) : (
          <ActivityIndicator size="small" color="#64748b" />
        )}
      </View>
    </Animated.View>
  );
}

const indicatorStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(241,245,249,0.8)'},
  hintPill: {
    width: undefined,
    paddingHorizontal: 18},
  hintText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600'},
  offlineText: {
    marginLeft: 7}});
