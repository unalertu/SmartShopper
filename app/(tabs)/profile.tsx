import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { User } from 'lucide-react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 16 }} className="px-6 pb-6">
        <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">Profile</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6" style={{ marginTop: -60 }}>
        <View className="bg-slate-100 w-20 h-20 rounded-full items-center justify-center mb-5">
          <User size={36} color="#94a3b8" strokeWidth={1.5} />
        </View>
        <Text className="text-lg font-bold text-slate-800 mb-2">Your Profile</Text>
        <Text className="text-sm text-slate-400 text-center leading-5">
          Manage your account, preferences,{'\n'}and app settings.
        </Text>
      </View>
    </View>
  );
}
