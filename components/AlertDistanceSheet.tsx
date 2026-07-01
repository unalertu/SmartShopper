import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSettingsStore, NotificationSensitivity } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import { Check } from 'lucide-react-native';

interface AlertDistanceSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const SENSITIVITY_OPTIONS: { value: NotificationSensitivity; label: string; description: string }[] = [
  { value: "near", label: "Near (100m)", description: "Notify when you're very close." },
  { value: "balanced", label: "Balanced (150m)", description: "Recommended for most users." },
  { value: "far", label: "Far (300m)", description: "Get notified earlier." },
];

const AlertDistanceSheet = memo(function AlertDistanceSheet({
  visible,
  onDismiss,
}: AlertDistanceSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);
  const { 
    notificationSensitivity,
    setNotificationSensitivity,
  } = useSettingsStore();

  useEffect(() => {
    if (visible) {
      isSheetOpenRef.current = true;
      setTimeout(() => {
        bottomSheetRef.current?.present();
      }, 50);
    } else {
      if (isSheetOpenRef.current) {
        bottomSheetRef.current?.dismiss();
        isSheetOpenRef.current = false;
      }
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
      />
    ),
    []
  );

  const modalName = React.useMemo(() => `alert-distance-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <BottomSheetModal
      name={modalName}
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Alert Distance</Text>
          <Text style={styles.description}>How close you need to be to a store before receiving a notification.</Text>
        </View>

        <View style={{ paddingBottom: 20 }}>
          <View style={styles.card}>
            {SENSITIVITY_OPTIONS.map((option, index) => {
              const isSelected = notificationSensitivity === option.value;
              const isLast = index === SENSITIVITY_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticImpact(ImpactFeedbackStyle.Light);
                    setNotificationSensitivity(option.value);
                  }}
                  style={[styles.row, !isLast && styles.borderBottom]}
                >
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{option.label}</Text>
                    <Text style={styles.rowDescription}>{option.description}</Text>
                  </View>
                  {isSelected && <Check size={20} color="#0f172a" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            hapticImpact(ImpactFeedbackStyle.Light);
            if (isSheetOpenRef.current) {
              bottomSheetRef.current?.dismiss();
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default AlertDistanceSheet;

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#f1f5f9', // Slightly gray background like iOS settings
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowContent: {
    flex: 1,
    paddingRight: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  rowDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  button: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
