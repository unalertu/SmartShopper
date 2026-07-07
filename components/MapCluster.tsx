import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShoppingBasket } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

interface MapClusterProps {
  pointCount: number;
  onPress: () => void;
  /**
   * Mount already settled (skips the entrance spring/fade). Used when markers
   * are restored after the map tab regains focus, so they reappear exactly as
   * they looked before — no replayed animations.
   */
  instant?: boolean;
}

const MapCluster: React.FC<MapClusterProps> = React.memo(({ pointCount, onPress, instant }) => {
  // Shared values — UI thread only, no JS bridge, auto-GC'd on unmount
  // (initializers run once at mount, so `instant` only affects the entrance)
  const scale = useSharedValue(instant ? 1 : 0.5);
  const opacity = useSharedValue(instant ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 280 });
    return () => {
      // Guarantee no leaked animation nodes when cluster unmounts
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Dynamic size based on count
  const height = pointCount > 50 ? 41 : pointCount > 20 ? 37 : 33;
  const width = height + (pointCount > 99 ? 24 : pointCount > 9 ? 20 : 16);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Soft outer glow ring */}
      <View style={[styles.outerRing, { width: width + 7, height: height + 7, borderRadius: (height + 7) / 2 }]} />
      {/* Main bubble */}
      <View style={[styles.bubble, { width, height, borderRadius: height / 2 }]}>
        <ShoppingBasket size={height * 0.4} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
        <Text style={[styles.text, pointCount > 99 ? { fontSize: 10 } : null]}>{pointCount}</Text>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if pointCount changes
  return prevProps.pointCount === nextProps.pointCount;
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'},
  outerRing: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.10)'},
  bubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // Soft premium shadow
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums']}});
MapCluster.displayName = 'MapCluster';

export default MapCluster;

