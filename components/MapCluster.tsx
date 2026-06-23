import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket } from 'lucide-react-native';

interface MapClusterProps {
  pointCount: number;
  onPress: () => void;
}

const MapCluster: React.FC<MapClusterProps> = React.memo(({ pointCount, onPress }) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true}),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true})
    ]).start();
  }, []);

  // Dynamic size based on count
  const height = pointCount > 50 ? 41 : pointCount > 20 ? 37 : 33;
  const width = height + (pointCount > 99 ? 24 : pointCount > 9 ? 20 : 16);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }], opacity }]}>
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
