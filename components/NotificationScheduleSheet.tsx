import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSettingsStore } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

interface NotificationScheduleSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const DAYS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const NotificationScheduleSheet = memo(function NotificationScheduleSheet({
  visible,
  onDismiss,
}: NotificationScheduleSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);
  const {
    smartScheduleEnabled,
    setSmartScheduleEnabled,
    allowedDays,
    setAllowedDays
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

  const toggleDay = useCallback((dayValue: number) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    const safeAllowedDays = allowedDays || [];
    if (safeAllowedDays.includes(dayValue)) {
      // Prevent deselecting the last day
      if (safeAllowedDays.length <= 1) return;
      setAllowedDays(safeAllowedDays.filter(d => d !== dayValue));
    } else {
      setAllowedDays([...safeAllowedDays, dayValue]);
    }
  }, [allowedDays, setAllowedDays]);

  const toggleSchedule = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    setSmartScheduleEnabled(!smartScheduleEnabled);
  }, [smartScheduleEnabled, setSmartScheduleEnabled]);

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

  const modalName = React.useMemo(() => `schedule-sheet-${Math.random().toString(36).substr(2, 9)}`, []);
  const switchTrackColor = { false: '#E5E7EB', true: '#0f172a' };

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
          <Text style={styles.title}>Notification Schedule</Text>
          <Text style={styles.description}>Set specific days for notifications.</Text>
        </View>

        <View style={{ paddingBottom: 20 }}>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Enable Custom Schedule</Text>
              <Switch
                value={smartScheduleEnabled}
                onValueChange={toggleSchedule}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </View>

          {smartScheduleEnabled && (
            <>
              <Text style={styles.sectionTitle}>Allowed Days</Text>
              <View style={styles.card}>
                {DAYS.map((day, index) => {
                  const isEnabled = (allowedDays || []).includes(day.value);
                  const isLastDay = isEnabled && (allowedDays || []).length === 1;
                  return (
                    <View key={day.value} style={[styles.row, index !== DAYS.length - 1 && styles.borderBottom]}>
                      <Text style={[styles.rowLabel, isLastDay && styles.disabledText]}>{day.label}</Text>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleDay(day.value)}
                        disabled={isLastDay}
                        trackColor={switchTrackColor}
                        thumbColor="#ffffff"
                        ios_backgroundColor="#E5E7EB"
                      />
                    </View>
                  );
                })}
              </View>
            </>
          )}
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

export default NotificationScheduleSheet;

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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
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
  borderBottom: {
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  disabledText: {
    color: '#94a3b8',
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
