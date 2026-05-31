import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

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
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Dynamic size based on count
  const size = pointCount > 50 ? 44 : pointCount > 20 ? 40 : 36;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }], opacity }]}>
      {/* Soft outer glow ring */}
      <View style={[styles.outerRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]} />
      {/* Main bubble */}
      <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.text, pointCount > 99 ? { fontSize: 11 } : null]}>{pointCount}</Text>
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
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.10)',
  },
  bubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    // Soft premium shadow
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
});
MapCluster.displayName = 'MapCluster';

export default MapCluster;
