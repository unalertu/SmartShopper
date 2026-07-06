import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Modal, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { Navigation } from 'lucide-react-native';

export interface LocationPermissionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onGranted: () => void;
  isTurningOff?: boolean;
}

const LocationPermissionSheet = memo(function LocationPermissionSheet({
  visible,
  onDismiss,
  onGranted,
  isTurningOff
}: LocationPermissionSheetProps) {

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isTurningOff) {
      onDismiss();
      setTimeout(() => {
        Alert.alert(
          'Disable Location Services',
          'To turn off location permissions, please go to your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      }, 500);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      onGranted();
      onDismiss();
    } else {
      onDismiss();
      // Use native iOS popup for denied state, delay to avoid Modal dismiss conflict
      setTimeout(() => {
        Alert.alert(
          'Location Access Required',
          "GeoCart needs location access to notify you when you're near stores. You can enable location permissions anytime in Settings.",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      }, 500);
    }
  };

  const handleNotNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.iconContainer}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="location.fill" size={32} tintColor="#0f172a" />
            ) : (
              <Navigation size={32} color="#0f172a" />
            )}
          </View>
          <Text style={styles.title}>Enable Location Reminders</Text>
          <Text style={styles.description}>
            GeoCart uses your location to remind you when you&apos;re near stores on your shopping list. Location updates are optimized to minimize battery usage. Your location is never shared or sold.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

export default LocationPermissionSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Slate-900 with 40% opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 17,
    fontWeight: '600',
  },
});
