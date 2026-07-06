import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ShoppingBasket, BellOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

interface StoreMarkerProps {
  isSaved: boolean;
  isSelected: boolean;
  isMuted?: boolean;
}

const StoreMarker: React.FC<StoreMarkerProps> = React.memo(({ isSaved, isSelected, isMuted }) => {
  // Shared values live on the UI thread — no JS bridge overhead, auto-cleaned on unmount
  const scale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(isSelected ? 1 : 0);

  // Mount animation: spring in from 0.6 → 0.847
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0.847, { damping: 12, stiffness: 120 });
    return () => {
      // Cancel any in-flight animation when the marker unmounts (scrolled off screen)
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection change animation
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0.847, { damping: 14, stiffness: 160 });
    glowOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
  }, [isSelected, scale, glowOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // ── Marker: White capsule with basket icon ──
  // Saved shops have a thin navy ring around them.
  // Muted shops have a gray ring around them, with the standard basket.
  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Selection glow ring */}
        <Animated.View style={[styles.glowRing, glowStyle]} />

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
  return prevProps.isSaved === nextProps.isSaved &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMuted === nextProps.isMuted;
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

