import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface ProgressiveBlurProps {
  height: number;
  maxIntensity?: number;
  tint?: 'light' | 'dark' | 'default';
  layers?: number;
}

/**
 * A drop-in React Native replacement for a Progressive Blur Header.
 * Stacks multiple BlurViews with varying heights to create a smooth fade-out blur effect.
 */
export default function ProgressiveBlur({ 
  height, 
  maxIntensity = 60,
  tint = 'light' 
}: ProgressiveBlurProps) {
  // Stacking many BlurViews compound their internal tint, creating a harsh white block
  // on iOS. By using only a few layers with lower intensity, we avoid the heavy white
  // block and achieve a cleaner gradient blur.
  return (
    <View style={[StyleSheet.absoluteFill, { height, overflow: 'hidden' }]} pointerEvents="none">
      {/* Mid layer that covers the core section */}
      <BlurView
        intensity={maxIntensity * 0.4}
        tint={tint}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.7 }}
      />
      {/* Top layer hugging the camera to provide primary blur for status bar */}
      <BlurView
        intensity={maxIntensity * 0.5}
        tint={tint}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.4 }}
      />
    </View>
  );
}
