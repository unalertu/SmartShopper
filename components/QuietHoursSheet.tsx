import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSettingsStore } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';

interface QuietHoursSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

function formatHour(hour: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

const QuietHoursSheet = memo(function QuietHoursSheet({
  visible,
  onDismiss,
}: QuietHoursSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);
  const { 
    quietHoursEnabled, 
    setQuietHoursEnabled,
    allowedHoursStart,
    setAllowedHoursStart,
    allowedHoursEnd,
    setAllowedHoursEnd
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

  const toggleQuietHours = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    setQuietHoursEnabled(!quietHoursEnabled);
  }, [quietHoursEnabled, setQuietHoursEnabled]);

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

  const modalName = React.useMemo(() => `quiet-hours-sheet-${Math.random().toString(36).substr(2, 9)}`, []);
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
          <Text style={styles.title}>Quiet Hours</Text>
          <Text style={styles.description}>Set specific hours for notifications.</Text>
        </View>

        <View style={{ paddingBottom: 20 }}>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Enable Quiet Hours</Text>
              <Switch
                value={quietHoursEnabled}
                onValueChange={toggleQuietHours}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </View>

          {quietHoursEnabled && (
            <>
              <Text style={styles.sectionTitle}>Allowed Hours</Text>
              <View style={styles.card}>
                <View style={[styles.row, styles.borderBottom]}>
                  <Text style={styles.rowLabel}>Start Time</Text>
                  <View style={styles.hourSelector}>
                    <TouchableOpacity
                      style={styles.hourButton}
                      onPress={() => {
                        hapticImpact(ImpactFeedbackStyle.Light);
                        setAllowedHoursStart(allowedHoursStart === 0 ? 23 : allowedHoursStart - 1);
                      }}
                    >
                      <Minus size={16} color="#64748b" />
                    </TouchableOpacity>
                    <Text style={styles.hourText}>{formatHour(allowedHoursStart)}</Text>
                    <TouchableOpacity
                      style={styles.hourButton}
                      onPress={() => {
                        hapticImpact(ImpactFeedbackStyle.Light);
                        setAllowedHoursStart((allowedHoursStart + 1) % 24);
                      }}
                    >
                      <Plus size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>End Time</Text>
                  <View style={styles.hourSelector}>
                    <TouchableOpacity
                      style={styles.hourButton}
                      onPress={() => {
                        hapticImpact(ImpactFeedbackStyle.Light);
                        setAllowedHoursEnd(allowedHoursEnd === 0 ? 23 : allowedHoursEnd - 1);
                      }}
                    >
                      <Minus size={16} color="#64748b" />
                    </TouchableOpacity>
                    <Text style={styles.hourText}>{formatHour(allowedHoursEnd)}</Text>
                    <TouchableOpacity
                      style={styles.hourButton}
                      onPress={() => {
                        hapticImpact(ImpactFeedbackStyle.Light);
                        setAllowedHoursEnd((allowedHoursEnd + 1) % 24);
                      }}
                    >
                      <Plus size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {allowedHoursStart === allowedHoursEnd && (
                <Text style={styles.hintText}>24-hour schedule: Notifications allowed all day.</Text>
              )}
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

export default QuietHoursSheet;

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
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  disabledText: {
    color: '#94a3b8',
  },
  hourSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  hourButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hourText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    width: 75,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    marginHorizontal: 12,
    textAlign: 'center',
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
