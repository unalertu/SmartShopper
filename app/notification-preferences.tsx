import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { MapPin, Menu, Vibrate, ChevronLeft, Lock, Clock, Calendar, SlidersHorizontal, Activity, ChevronRight } from 'lucide-react-native';
import { useSettingsStore } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import ConfirmationSheet, { ConfirmationSheetData } from '../components/ConfirmationSheet';
import ComingSoonSheet from '../components/ComingSoonSheet';
import NotificationScheduleSheet from '../components/NotificationScheduleSheet';
import QuietHoursSheet from '../components/QuietHoursSheet';
import { showPaywall } from "@/services/paywallService";

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
  'Notification Schedule': {
    enable: "Notifications will only arrive during your scheduled times instead of in real-time.",
    disable: "Notifications will arrive in real-time without following any custom schedule.",
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
  onLockedPress,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  isProOnly?: boolean;
  isLocked?: boolean;
  onLockedPress?: () => void;
  onPress?: () => void;
}) {
  const content = (
    <View className={`flex-row justify-between items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}
      style={isLocked ? { opacity: 0.5 } : undefined}
    >
      <View className="flex-row items-center flex-1 pr-4">
        {icon}
        <View className="ml-3 flex-shrink">
          <Text className="text-[15px] font-medium text-slate-900">{label}</Text>
          {sublabel && <Text className="text-[12px] text-slate-400 mt-0.5">{sublabel}</Text>}
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        {isProOnly && (
          <View className="bg-[#D4AF37]/15 px-3 py-1 rounded-full flex-row items-center">
            <Text className="text-[#D4AF37] font-medium text-[11px] uppercase tracking-wider">Pro</Text>
          </View>
        )}
        {rightElement}
      </View>
    </View>
  );

  if (isLocked && onLockedPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onLockedPress}>
        {content}
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
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
          <Text className="text-[13px] font-semibold text-slate-400 tracking-wider">{title}</Text>
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
    notificationSensitivity,
    setSavedStoresOnly,
    setShoppingListReminders,
    setNotificationSensitivity
  } = useSettingsStore();

  // ── Confirmation Sheet state ──
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetData, setSheetData] = useState<ConfirmationSheetData | null>(null);

  // ── Coming Soon Sheet state ──
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonData, setComingSoonData] = useState({ title: '', description: '' });

  // ── Notification Schedule Sheet state ──
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);

  // ── Quiet Hours Sheet state ──
  const [quietHoursSheetVisible, setQuietHoursSheetVisible] = useState(false);

  const showComingSoon = useCallback((title: string, description: string) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    setComingSoonData({ title, description });
    setComingSoonVisible(true);
  }, []);

  const switchTrackColor = { false: '#E5E7EB', true: '#0f172a' };

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
    showPaywall();
  };

  const SENSITIVITY_OPTIONS = {
    near: "Near (100m)",
    balanced: "Balanced (150m)",
    far: "Far (300m)",
  };

  const handleSensitivityPress = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    const order: ("near" | "balanced" | "far")[] = ['near', 'balanced', 'far'];
    const currentIndex = order.indexOf(notificationSensitivity);
    const nextIndex = (currentIndex + 1) % order.length;
    setNotificationSensitivity(order[nextIndex]);
  };

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar style="dark" />

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
                ios_backgroundColor="#E5E7EB"
              />
            }
          />
          <SettingsRow
            icon={<Menu size={20} color="#64748b" />}
            label="Shopping List Reminders"
            sublabel="Notify for nearby stores"
            isLast
            rightElement={
              <Switch
                value={shoppingListReminders}
                onValueChange={() => requestToggle('Shopping List Reminders', shoppingListReminders, setShoppingListReminders)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
                ios_backgroundColor="#E5E7EB"
              />
            }
          />
        </SettingsGroup>

        {/* Advanced Notification Settings — Pro Only */}
        <SettingsGroup title="Advanced">
          <SettingsRow
            icon={<Activity size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Notification Sensitivity"
            sublabel="Radius for store alerts"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Notification Sensitivity')}
            rightElement={
              isPro ? (
                <TouchableOpacity
                  onPress={handleSensitivityPress}
                  className="bg-slate-100 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-[13px] font-medium text-slate-700">
                    {SENSITIVITY_OPTIONS[notificationSensitivity]}
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
          <SettingsRow
            icon={<Clock size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Quiet Hours"
            sublabel="Mute notifications during set hours"
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Quiet Hours')}
            onPress={isPro ? () => setQuietHoursSheetVisible(true) : undefined}
            rightElement={<ChevronRight size={20} color="#cbd5e1" />}
          />
          <SettingsRow
            icon={<Calendar size={20} color={isPro ? "#64748b" : "#cbd5e1"} />}
            label="Notification Schedule"
            sublabel="Set specific days for notifications"
            isLast
            isProOnly={!isPro}
            isLocked={!isPro}
            onLockedPress={() => handleProUpsell('Notification Schedule')}
            onPress={isPro ? () => setScheduleSheetVisible(true) : undefined}
            rightElement={<ChevronRight size={20} color="#cbd5e1" />}
          />
        </SettingsGroup>

        <View className="mx-8 mt-2 mb-8">
          <Text className="text-[13px] text-slate-400 leading-5 text-center">
            SmartShopper only checks your location periodically and intelligently reduces activity when you're driving, inactive, or have no active shopping lists. This helps minimize battery usage while still delivering timely reminders.
          </Text>
        </View>

      </ScrollView>

      {/* Inline Confirmation Sheet */}
      <ConfirmationSheet
        visible={sheetVisible}
        data={sheetData}
        onDismiss={dismissSheet}
      />

      {/* Coming Soon Sheet */}
      <ComingSoonSheet
        visible={comingSoonVisible}
        title={comingSoonData.title}
        description={comingSoonData.description}
        onDismiss={() => setComingSoonVisible(false)}
      />

      {/* Notification Schedule Sheet */}
      <NotificationScheduleSheet
        visible={scheduleSheetVisible}
        onDismiss={() => setScheduleSheetVisible(false)}
      />

      {/* Quiet Hours Sheet */}
      <QuietHoursSheet
        visible={quietHoursSheetVisible}
        onDismiss={() => setQuietHoursSheetVisible(false)}
      />
    </View>
  );
}
