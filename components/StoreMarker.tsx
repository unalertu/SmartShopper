import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket, BellOff } from 'lucide-react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

interface StoreMarkerProps {
  isSaved: boolean;
  isSelected: boolean;
  isMuted?: boolean;
}

const StoreMarker: React.FC<StoreMarkerProps> = React.memo(({ isSaved, isSelected, isMuted }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  // Track initial mount to avoid duplicate animations
  const isMounted = useRef(false);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1 : 0.847,
      friction: 6,
      tension: 120,
      useNativeDriver: true}).start();
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1 : 0.847,
        friction: 7,
        tension: 160,
        useNativeDriver: true}),
      Animated.timing(glowOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true})
    ]).start();
  }, [isSelected]);

  // ── Marker: White capsule with basket icon ──
  // Saved shops have a thin navy ring around them.
  // Muted shops have a gray ring around them, with the standard basket.
  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        {/* Selection glow ring */}
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
        
        {/* Main marker capsule */}
        <View style={[
          styles.markerCapsule, 
          isSaved && styles.markerCapsuleSaved
        ]}>
          <ShoppingBasket size={18} color="#0f172a" strokeWidth={2.2} />
        </View>

        {/* Muted Badge */}
        {isMuted && (
          <View style={styles.mutedBadge}>
            <BellOff size={14} color="#64748b" strokeWidth={2.5} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSaved === nextProps.isSaved && prevProps.isSelected === nextProps.isSelected && prevProps.isMuted === nextProps.isMuted;
});

const styles = StyleSheet.create({
  wrapper: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center'},

  // ── Unsaved marker styles ──
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56},
  glowRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1.8,
    borderColor: 'rgba(15, 23, 42, 0.12)'},
  markerCapsule: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    // Prominent shadow so it is clearly visible without being clicked
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3.5 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 8,
  },

  markerCapsuleSaved: {
    borderWidth: 3,
    borderColor: '#0f172a',
  },
  mutedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 10,
    zIndex: 10,
  }});
StoreMarker.displayName = 'StoreMarker';

export default StoreMarker;
