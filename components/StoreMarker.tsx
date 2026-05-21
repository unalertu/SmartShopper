import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ShoppingBasket, MapPin } from 'lucide-react-native';

interface StoreMarkerProps {
  isSaved: boolean;
  isSelected: boolean;
}

const StoreMarker: React.FC<StoreMarkerProps> = ({ isSaved, isSelected }) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const selectedScale = useRef(new Animated.Value(isSelected ? 1.25 : 1)).current;
  const glowOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(selectedScale, {
        toValue: isSelected ? 1.25 : 1,
        friction: 5,
        tension: 150,
        useNativeDriver: false,
      }),
      Animated.timing(glowOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start();
  }, [isSelected]);

  const animatedTransform = [{ scale: Animated.multiply(scale, selectedScale) }];

  return (
    <Animated.View style={[styles.container, { transform: animatedTransform }]}>
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
  );
};

const styles = StyleSheet.create({
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
