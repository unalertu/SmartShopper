import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export default function AppLogo({ width = 110, height = 110, color = '#0f172a', strokeWidth = 5, style }: any) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {/* Handle and back vertical line */}
      <Path d="M 10 20 L 30 20 L 40 70" />
      
      {/* Horizontal bars (forming the basket) */}
      <Path d="M 34 40 L 59 40" />
      <Path d="M 37 55 L 63 55" />
      <Path d="M 40 70 L 70 70" />
      
      {/* Map Pin on the right side */}
      <Path d="M 70 70 C 70 70 85 50 85 35 A 15 15 0 1 0 55 35 C 55 50 70 70 70 70 Z" />
      
      {/* Map Pin Inner Dot */}
      <Circle cx="70" cy="35" r="4" />
      
      {/* Wheels */}
      <Circle cx="45" cy="85" r="6" />
      <Circle cx="65" cy="85" r="6" />
    </Svg>
  );
}
