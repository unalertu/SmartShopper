import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Flame } from 'lucide-react-native';

const HEADER_CONTENT_HEIGHT = 56;

interface FrostedHeaderProps {
  title?: string;
  streakCount?: number;
  onStreakPress?: () => void;
}

export default function FrostedHeader({
  title = 'Smart Shopper',
  streakCount = 0,
  onStreakPress,
}: FrostedHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

  return (
    <View style={[styles.container, { height: headerHeight, paddingTop: insets.top }]}>
      {/* Frosted glass background */}
      <BlurView
        intensity={80}
        tint="systemMaterial"
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle bottom separator */}
      <View style={styles.bottomBorder} />

      {/* Header content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Image
            source={require('../assets/images/app-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{title}</Text>
        </View>

        <TouchableOpacity
          style={styles.streakBadge}
          onPress={onStreakPress}
          activeOpacity={0.7}
        >
          <Flame size={16} color="#f97316" fill="#f97316" />
          <Text style={styles.streakText}>{streakCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Export so the parent can calculate paddingTop */
export { HEADER_CONTENT_HEIGHT };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  logo: {
    width: 56,
    height: 56,
    marginLeft: -24,
    marginTop: -4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
});
