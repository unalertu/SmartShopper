import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSettingsStore } from '../store/useSettingsStore';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import { Bell, BellOff, Clock3, RefreshCw } from 'lucide-react-native';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
// "Until I reopen the app" is cleared by app/_layout.tsx at the next cold
// start; this cap is just a safety net so a mute can never get stuck on.
const RELAUNCH_SAFETY_NET_MS = 365 * ONE_DAY_MS;

type MuteOption = 'on' | 'relaunch' | '1h' | '1d' | '1w' | 'off';

// Shared with notification-preferences.tsx so the settings row and this
// sheet always describe the exact same state in the exact same words.
export function getNearbyAlertsStatusText(
  shoppingListReminders: boolean,
  snoozeUntil: number | null,
  snoozeUntilRelaunch: boolean
): { short: string; long: string } {
  if (!shoppingListReminders) {
    return {
      short: 'Off',
      long: "Alerts are turned off. Choose an option below to turn them back on.",
    };
  }

  if (snoozeUntil !== null && Date.now() < snoozeUntil) {
    if (snoozeUntilRelaunch) {
      return {
        short: 'Muted until you reopen the app',
        long: "Alerts are paused until you reopen the app.",
      };
    }
    const target = new Date(snoozeUntil);
    const timeStr = target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const sameDay = target.toDateString() === new Date().toDateString();
    const whenShort = sameDay ? timeStr : `${target.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    return {
      short: `Muted until ${whenShort}`,
      long: `Alerts are paused until ${whenShort}.`,
    };
  }

  return {
    short: 'On',
    long: "You'll be notified when you're near a shop that has items on your list.",
  };
}

interface NearbyAlertsMuteSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onRequestTurnOff: () => void;
}

const NearbyAlertsMuteSheet = memo(function NearbyAlertsMuteSheet({
  visible,
  onDismiss,
  onRequestTurnOff,
}: NearbyAlertsMuteSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);
  const {
    shoppingListReminders,
    snoozeUntil,
    snoozeUntilRelaunch,
    setSnoozeUntil,
    setSnoozeUntilRelaunch,
    setShoppingListReminders,
  } = useSettingsStore();

  useEffect(() => {
    if (visible) {
      isSheetOpenRef.current = true;
      setTimeout(() => {
        bottomSheetRef.current?.present();
      }, 50);
    } else if (isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
      isSheetOpenRef.current = false;
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    onDismiss();
  }, [onDismiss]);

  const close = useCallback(() => {
    if (isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
    }
  }, []);

  const selectOption = useCallback((option: MuteOption) => {
    hapticImpact(ImpactFeedbackStyle.Light);

    if (option === 'off') {
      // Turning the feature off entirely is harder to reverse by accident
      // than a temporary mute, so it goes through the same confirmation
      // step as other permanent settings instead of applying immediately.
      close();
      onRequestTurnOff();
      return;
    }

    if (!shoppingListReminders) setShoppingListReminders(true);

    switch (option) {
      case 'on':
        setSnoozeUntil(null);
        setSnoozeUntilRelaunch(false);
        break;
      case 'relaunch':
        setSnoozeUntilRelaunch(true);
        setSnoozeUntil(Date.now() + RELAUNCH_SAFETY_NET_MS);
        break;
      case '1h':
        setSnoozeUntilRelaunch(false);
        setSnoozeUntil(Date.now() + ONE_HOUR_MS);
        break;
      case '1d':
        setSnoozeUntilRelaunch(false);
        setSnoozeUntil(Date.now() + ONE_DAY_MS);
        break;
      case '1w':
        setSnoozeUntilRelaunch(false);
        setSnoozeUntil(Date.now() + ONE_WEEK_MS);
        break;
    }
    close();
  }, [shoppingListReminders, setSnoozeUntil, setSnoozeUntilRelaunch, setShoppingListReminders, close, onRequestTurnOff]);

  const isMuted = shoppingListReminders && snoozeUntil !== null && Date.now() < snoozeUntil;
  const isOff = !shoppingListReminders;
  const status = getNearbyAlertsStatusText(shoppingListReminders, snoozeUntil, snoozeUntilRelaunch);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.35} />
    ),
    []
  );

  const modalName = React.useMemo(() => `nearby-alerts-mute-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  const options: { key: MuteOption; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
    ...(isMuted || isOff ? [{ key: 'on' as MuteOption, label: 'Turn Alerts On', icon: <Bell size={18} color="#0f172a" /> }] : []),
    { key: 'relaunch', label: 'Mute Until I Reopen the App', icon: <RefreshCw size={18} color="#64748b" /> },
    { key: '1h', label: 'Mute for 1 Hour', icon: <Clock3 size={18} color="#64748b" /> },
    { key: '1d', label: 'Mute for 1 Day', icon: <Clock3 size={18} color="#64748b" /> },
    { key: '1w', label: 'Mute for 1 Week', icon: <Clock3 size={18} color="#64748b" /> },
    { key: 'off', label: 'Turn Off Indefinitely', icon: <BellOff size={18} color="#ef4444" />, destructive: true },
  ];

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
          <Text style={styles.title}>Nearby Shop Alerts</Text>
          <Text style={styles.description}>{status.long}</Text>
        </View>

        <View style={{ paddingBottom: 20 }}>
          <View style={styles.card}>
            {options.map((option, index) => {
              const isLast = index === options.length - 1;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.7}
                  onPress={() => selectOption(option.key)}
                  style={[styles.row, !isLast && styles.borderBottom]}
                >
                  <View style={styles.rowContent}>
                    {option.icon}
                    <Text style={[styles.rowLabel, option.destructive && styles.rowLabelDestructive]}>
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            hapticImpact(ImpactFeedbackStyle.Light);
            close();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default NearbyAlertsMuteSheet;

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#f1f5f9',
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
    height: 52,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  },
  rowLabelDestructive: {
    color: '#ef4444',
  },
  button: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});
