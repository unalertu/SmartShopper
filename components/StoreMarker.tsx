import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket, MapPin } from 'lucide-react-native';

interface StoreMarkerProps {
  isSaved: boolean;
  isSelected: boolean;
}

const StoreMarker: React.FC<StoreMarkerProps> = React.memo(({ isSaved, isSelected }) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  // Track initial mount to avoid duplicate animations
  const isMounted = useRef(false);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.25 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isSelected ? 1.25 : 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [isSelected]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        {/* Subtle Glow Layer */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: 1.4 }] }, isSaved ? styles.glowSaved : styles.glowUnsaved]} />
        
        {/* Main Pill */}
        <View style={[styles.markerPill, isSaved ? styles.markerPillSaved : styles.markerPillUnsaved]}>
          {isSaved ? (
            <MapPin size={18} color="#fff" />
          ) : (
            <ShoppingBasket size={18} color="#0f172a" />
          )}
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
  glowSaved: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)', // Red glow
  },
  glowUnsaved: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  markerPill: {
    padding: 7,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  markerPillSaved: {
    backgroundColor: '#ef4444', // Red background
    borderColor: '#ef4444',
  },
  markerPillUnsaved: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
});

export default StoreMarker;
