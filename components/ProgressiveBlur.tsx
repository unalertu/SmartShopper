import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface ProgressiveBlurProps {
  height: number;
  maxIntensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'transparent';
  layers?: number;
}

/**
 * A drop-in React Native replacement for a Progressive Blur Header.
 * Stacks multiple BlurViews with varying heights to create a smooth fade-out blur effect.
 */
export default function ProgressiveBlur({ 
  height, 
  maxIntensity = 80,
  tint = 'light',
  layers = 8
}: ProgressiveBlurProps) {
  // We divide the overall intensity among the layers
  // The top area will have all layers overlapping, bottom will have fewer
  const stepIntensity = maxIntensity / layers;

  return (
    <View style={[StyleSheet.absoluteFill, { height, overflow: 'hidden' }]} pointerEvents="none">
      {Array.from({ length: layers }).map((_, i) => {
        // Height decreases as we go up in index, so the top gets more overlapping layers
        // Using an easing function curve (x^2) makes the blur transition smoother
        const progress = (layers - i) / layers;
        const layerHeight = height * (progress * progress);
        
        return (
          <BlurView
            key={`blur-layer-${i}`}
            intensity={stepIntensity}
            tint={tint}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: layerHeight,
            }}
          />
        );
      })}
    </View>
  );
}
