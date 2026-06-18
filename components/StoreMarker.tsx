import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket } from 'lucide-react-native';
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
      toValue: isSelected ? 1.18 : 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true}).start();
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1.18 : 1,
        friction: 7,
        tension: 160,
        useNativeDriver: true}),
      Animated.timing(glowOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true})
    ]).start();
  }, [isSelected]);

  // ── Saved marker: Apple Maps-inspired geometric pin ──
  if (isSaved) {
    return (
      <View style={styles.wrapper}>
        <Animated.View style={[styles.pinContainer, { transform: [{ scale }] }]}>
          {/* Glow — positioned behind the circular body of the pin */}
          <Animated.View style={[styles.pinGlow, { opacity: glowOpacity, transform: [{ scale: 1.4 }] }]} />

          {/* Custom SVG pin shape */}
          <View style={styles.pinShadow}>
            <Svg width={22} height={26} viewBox="0 0 24 28">
              <Path
                d="M12 27 C12 27 2 19 2 11 C2 5.48 6.48 1 12 1 C17.52 1 22 5.48 22 11 C22 19 12 27 12 27 Z"
                fill={isMuted ? "#94a3b8" : "#F2726F"}
              />
              <SvgCircle cx={12} cy={11} r={4} fill="rgba(255,255,255,0.92)" />
            </Svg>
            {isMuted && (
              <View style={styles.muteSlashContainerSaved} pointerEvents="none">
                <View style={styles.muteSlash} />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Unsaved marker: Apple-style white capsule with basket icon ──
  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        {/* Selection glow ring */}
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
        
        {/* Main marker capsule */}
        <View style={styles.markerCapsule}>
          <ShoppingBasket size={15} color="#0f172a" strokeWidth={2.2} />
          {isMuted && (
            <View style={styles.muteSlashContainerUnsaved} pointerEvents="none">
              <View style={styles.muteSlash} />
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSaved === nextProps.isSaved && prevProps.isSelected === nextProps.isSelected && prevProps.isMuted === nextProps.isMuted;
});

const styles = StyleSheet.create({
  wrapper: {
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center'},

  // ── Unsaved marker styles ──
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48},
  glowRing: {
    position: 'absolute',
    width: 41,
    height: 41,
    borderRadius: 20.5,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.12)'},
  markerCapsule: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    // Prominent shadow so it is clearly visible without being clicked
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },

  // ── Saved pin styles ──
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44},
  pinGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(242, 114, 111, 0.25)',
    top: 6,
    left: 10},
  pinShadow: {

  },
  muteSlashContainerUnsaved: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  muteSlashContainerSaved: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  muteSlash: {
    width: 26,
    height: 2.5,
    backgroundColor: '#ef4444',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  }});
StoreMarker.displayName = 'StoreMarker';

export default StoreMarker;
