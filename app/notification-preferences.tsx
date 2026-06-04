import React from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { MapPin, List, Bell, Vibrate, Battery, ExternalLink, ChevronLeft } from 'lucide-react-native';
import { useSettingsStore } from '../store';
import { hapticImpact } from '../services/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

function SettingsRow({
  icon,
  label,
  sublabel,
  rightElement,
  isLast
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row justify-between items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}>
      <View className="flex-row items-center flex-1 pr-4">
        {icon}
        <View className="ml-3 flex-shrink">
          <Text className="text-[15px] font-medium text-slate-900">{label}</Text>
          {sublabel && <Text className="text-[12px] text-slate-400 mt-0.5">{sublabel}</Text>}
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">{rightElement}</View>
    </View>
  );
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
      layout={LinearTransition.springify()}
      className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 mx-6"
    >
      {children}
    </Animated.View>
  );
}

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const {
    savedStoresOnly,
    shoppingListReminders,
    backgroundNotifications,
    hapticEnabled,
    lowPowerMode,
    autoOpenNearbyList,
    setSavedStoresOnly,
    setShoppingListReminders,
    setBackgroundNotifications,
    setHapticEnabled,
    setLowPowerMode,
    setAutoOpenNearbyList
  } = useSettingsStore();

  const switchTrackColor = { false: '#e2e8f0', true: '#0f172a' };

  const handleToggle = (setter: (val: boolean) => void) => (val: boolean) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    setter(val);
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
        <Text className="text-xl font-semibold text-slate-900 ml-4">Notification Preferences</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        <SettingsGroup>
          <SettingsRow
            icon={<MapPin size={20} color="#64748b" />}
            label="Saved Stores Only"
            sublabel="Only notify for stores you've saved"
            rightElement={
              <Switch
                value={savedStoresOnly}
                onValueChange={handleToggle(setSavedStoresOnly)}
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
                onValueChange={handleToggle(setShoppingListReminders)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<Bell size={20} color="#64748b" />}
            label="Background Notifications"
            sublabel="Receive notifications when app is closed"
            rightElement={
              <Switch
                value={backgroundNotifications}
                onValueChange={handleToggle(setBackgroundNotifications)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<Vibrate size={20} color="#64748b" />}
            label="Haptic Feedback"
            sublabel="Vibrate when a notification arrives"
            rightElement={
              <Switch
                value={hapticEnabled}
                onValueChange={handleToggle(setHapticEnabled)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<Battery size={20} color="#64748b" />}
            label="Low Power Mode"
            sublabel="Reduce background checks to save battery"
            rightElement={
              <Switch
                value={lowPowerMode}
                onValueChange={handleToggle(setLowPowerMode)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsRow
            icon={<ExternalLink size={20} color="#64748b" />}
            label="Auto Open Nearby List"
            sublabel="Open list directly from notification tap"
            isLast
            rightElement={
              <Switch
                value={autoOpenNearbyList}
                onValueChange={handleToggle(setAutoOpenNearbyList)}
                trackColor={switchTrackColor}
                thumbColor="#ffffff"
              />
            }
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}
