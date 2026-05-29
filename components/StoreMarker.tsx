import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket } from 'lucide-react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

interface StoreMarkerProps {
  isSaved: boolean;
  isSelected: boolean;
}

const StoreMarker: React.FC<StoreMarkerProps> = React.memo(({ isSaved, isSelected }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  // Track initial mount to avoid duplicate animations
  const isMounted = useRef(false);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.25 : 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1.25 : 1,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      })
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
            <Svg width={24} height={28} viewBox="0 0 24 28">
              <Path
                d="M12 27 C12 27 2 19 2 11 C2 5.48 6.48 1 12 1 C17.52 1 22 5.48 22 11 C22 19 12 27 12 27 Z"
                fill="#F2726F"
              />
              <SvgCircle cx={12} cy={11} r={4} fill="rgba(255,255,255,0.92)" />
            </Svg>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Unsaved marker: white circle with basket icon ──
  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        {/* Subtle Glow Layer */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: 1.4 }] }, styles.glowUnsaved]} />
        
        {/* Main Pill */}
        <View style={styles.markerPillUnsaved}>
          <ShoppingBasket size={18} color="#0f172a" />
        </View>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSaved === nextProps.isSaved && prevProps.isSelected === nextProps.isSelected;
});

const styles = StyleSheet.create({
  wrapper: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Unsaved marker styles ──
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  glow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  glowUnsaved: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  markerPillUnsaved: {
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e8ecf1',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Saved pin styles ──
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  pinGlow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(242, 114, 111, 0.25)',
    top: 7,
    left: 11,
  },
  pinShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
});
StoreMarker.displayName = 'StoreMarker';

export default StoreMarker;
