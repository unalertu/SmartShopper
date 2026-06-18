import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { MapPin, List, Vibrate, ChevronLeft, Lock, Sparkles, Clock, Calendar, Zap, SlidersHorizontal } from 'lucide-react-native';
import { useSettingsStore } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import ConfirmationSheet, { ConfirmationSheetData } from '../components/ConfirmationSheet';

// ── Per-setting descriptions for enable / disable states ──
const SETTING_DESCRIPTIONS: Record<string, { enable: string; disable: string }> = {
  'Saved Stores Only': {
    enable: "You'll only receive notifications from stores you've saved instead of all nearby stores.",
    disable: "You'll receive notifications from all nearby stores instead of only your saved stores.",
  },
  'Shopping List Reminders': {
    enable: "You'll be notified when a nearby store has items on your shopping list.",
    disable: "You won't receive reminders when passing stores that carry your list items.",
  },
  'Notification Haptics': {
    enable: "Your device will vibrate when alerts arrive for a more noticeable experience.",
    disable: "Alerts will arrive silently without any vibration feedback.",
  },
  'Quiet Hours': {
    enable: "Notifications will be paused during your quiet hours so you won't be disturbed.",
    disable: "You'll receive notifications at any time, including during previously quiet hours.",
  },
  'Notification Schedules': {
    enable: "Notifications will only arrive during your scheduled times instead of in real-time.",
    disable: "Notifications will arrive in real-time without following any custom schedule.",
  },
  'Priority Alerts': {
    enable: "Your key stores will trigger high-priority alerts that stand out from the rest.",
    disable: "All store notifications will be treated with the same priority level.",
  },
  'Smart Notification Rules': {
    enable: "AI will intelligently filter and group your notifications to reduce noise.",
    disable: "All notifications will arrive individually without AI-powered filtering.",
  },
  'Advanced Notification Settings': {
    enable: "You'll get full control over how each notification type behaves.",
    disable: "Notification behavior will return to the default settings.",
  },
};

function SettingsRow({
  icon,
  label,
  sublabel,
  rightElement,
  isLast,
  isProOnly,
  isLocked,
  onLockedPress
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  isProOnly?: boolean;
  isLocked?: boolean;
  onLockedPress?: () => void;
}) {
  const content = (
    <View className={`flex-row justify-between items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}
      style={isLocked ? { opacity: 0.5 } : undefined}
    >
      <View className="flex-row items-center flex-1 pr-4">
        {icon}
        <View className="ml-3 flex-shrink">
          <View className="flex-row items-center gap-2">
            <Text className="text-[15px] font-medium text-slate-900">{label}</Text>
            {isProOnly && (
              <View className="flex-row items-center gap-0.5 bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">
                <Lock size={8} color="#D4AF37" />
                <Text className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-wider">Pro</Text>
              </View>
            )}
          </View>
          {sublabel && <Text className="text-[12px] text-slate-400 mt-0.5">{sublabel}</Text>}
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">{rightElement}</View>
    </View>
  );

  if (isLocked && onLockedPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onLockedPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function SettingsGroup({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <>
      {title && (
        <View className="mx-8 mb-2">
          <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">{title}</Text>
        </View>
      )}
      <Animated.View
        layout={LinearTransition.springify()}
        className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 mx-6"
      >
        {children}
      </Animated.View>
    </>
  );
}

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const {
    isPro,
    savedStoresOnly,
    shoppingListReminders,
    hapticEnabled,
    setSavedStoresOnly,
    setShoppingListReminders,
    setHapticEnabled
  } = useSettingsStore();

  // ── Confirmation Sheet state ──
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetData, setSheetData] = useState<ConfirmationSheetData | null>(null);

  const switchTrackColor = { false: '#e2e8f0', true: '#0f172a' };

  const requestToggle = useCallback((
    settingName: string,
    currentValue: boolean,
    setter: ((val: boolean) => void) | null,
  ) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    const isEnabling = !currentValue;
    const descriptions = SETTING_DESCRIPTIONS[settingName];
    const description = isEnabling ? descriptions.enable : descriptions.disable;

    setSheetData({
      settingName,
      description,
      isEnabling,
      onConfirm: () => {
        if (setter) setter(isEnabling);
      },
    });
    setSheetVisible(true);
  }, []);

  const dismissSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetData(null);
  }, []);

  const handleProUpsell = (featureName: string) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    router.push('/paywall');
  };

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar style="dark" />
      <Stack.Screen 
        options={{
          headerShown: false,
          presentation: 'modal',
        }} 
      />

      <View style={{ paddingTop: insets.top }} className="px-4 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => {
            hapticImpact(ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm ml-2"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-slate-900 ml-4">Map & Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {/* Basic Notification Settings — Available to all users */}
        <SettingsGroup title="Notification Settings">
          <SettingsRow
            icon={<MapPin size={20} color="#64748b" />}
            label="Saved Stores Only"
            sublabel="Only notify for stores you've saved"
            rightElement={
              <Switch
                value={savedStoresOnly}
                onValueChange={() => requestToggle('Saved Stores Only', savedStoresOnly, setSavedStoresOnly)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<List size={20} color="#64748b" />}
            label="Shopping List Reminders"
            sublabel="Notify when you have items for nearby store"
            rightElement={
              <Switch
                value={shoppingListReminders}
                onValueChange={() => requestToggle('Shopping List Reminders', shoppingListReminders, setShoppingListReminders)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<Vibrate size={20} color="#64748b" />}
            label="Notification Haptics"
            sublabel="Vibrate on incoming alerts"
            isLast
            rightElement={
              <Switch
                value={hapticEnabled}
                onValueChange={() => requestToggle('Notification Haptics', hapticEnabled, setHapticEnabled)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
        </SettingsGroup>

        {/* Advanced Notification Settings — Pro Only */}
        <SettingsGroup title="Advanced">
          <SettingsRow
            icon={<Clock size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Quiet Hours"
            sublabel="Mute notifications during set hours"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Quiet Hours')}
            rightElement={
              isPro ? (
                <Switch
                  value={false}
                  onValueChange={() => requestToggle('Quiet Hours', false, null)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              ) : undefined
            }
          />
          <SettingsRow
            icon={<Calendar size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Notification Schedules"
            sublabel="Set specific times for notifications"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Notification Schedules')}
            rightElement={
              isPro ? (
                <Switch
                  value={false}
                  onValueChange={() => requestToggle('Notification Schedules', false, null)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              ) : undefined
            }
          />
          <SettingsRow
            icon={<Zap size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Priority Alerts"
            sublabel="High-priority notifications for key stores"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Priority Alerts')}
            rightElement={
              isPro ? (
                <Switch
                  value={false}
                  onValueChange={() => requestToggle('Priority Alerts', false, null)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              ) : undefined
            }
          />
          <SettingsRow
            icon={<Sparkles size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Smart Notification Rules"
            sublabel="AI-powered alert filtering and grouping"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Smart Notification Rules')}
            rightElement={
              isPro ? (
                <Switch
                  value={false}
                  onValueChange={() => requestToggle('Smart Notification Rules', false, null)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              ) : undefined
            }
          />
          <SettingsRow
            icon={<SlidersHorizontal size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Advanced Notification Settings"
            sublabel="Full control over notification behavior"
            isLast
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Advanced Notification Settings')}
            rightElement={
              isPro ? (
                <Switch
                  value={false}
                  onValueChange={() => requestToggle('Advanced Notification Settings', false, null)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              ) : undefined
            }
          />
        </SettingsGroup>

        {/* Upgrade Banner for Free Users */}
        {!isPro && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticImpact(ImpactFeedbackStyle.Light);
              router.push('/paywall');
            }}
            className="mx-6 mb-6 bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-3xl p-4 flex-row items-center"
          >
            <View className="h-10 w-10 rounded-2xl bg-[#D4AF37]/10 items-center justify-center mr-3 border border-[#D4AF37]/20">
              <Sparkles size={20} color="#D4AF37" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-slate-900">Unlock Advanced Controls</Text>
              <Text className="text-[12px] text-slate-400 mt-0.5">Upgrade to Pro for full notification customization</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Inline Confirmation Sheet */}
      <ConfirmationSheet
        visible={sheetVisible}
        data={sheetData}
        onDismiss={dismissSheet}
      />
    </View>
  );
}
