import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { User, Bell, SlidersHorizontal, SunMoon, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingTop: insets.top + 16, 
          paddingHorizontal: 24,
          paddingBottom: 100 // Space for tab bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="text-3xl font-bold text-slate-900 mb-6">Profile</Text>

        {/* Widget 1: Avatar Header */}
        <View 
          className="bg-white border border-slate-100 rounded-[32px] p-6 mb-6 flex-col items-center shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
        >
          <View className="h-24 w-24 rounded-full bg-slate-100 justify-center items-center mb-4">
            <User size={40} color="#94a3b8" strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-slate-900">John Doe</Text>
          <Text className="text-sm text-slate-500 mb-5">john.doe@smartshopper.com</Text>
          
          <TouchableOpacity className="bg-slate-100 px-5 py-2.5 rounded-xl">
            <Text className="text-slate-900 font-bold text-sm">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Widget 2: App Settings */}
        <View 
          className="bg-white border border-slate-100 rounded-[32px] p-6 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
        >
          <Text className="text-lg font-semibold text-slate-900 mb-2">App Settings</Text>

          {/* Row 1: Notifications */}
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center">
                <Bell size={20} color="#0f172a" />
              </View>
              <Text className="text-slate-900 font-medium text-[15px]">Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e2e8f0', true: '#0f172a' }}
              thumbColor={'#ffffff'}
            />
          </View>
          
          <View className="h-[1px] bg-slate-50 w-full" />

          {/* Row 2: Units */}
          <TouchableOpacity className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center">
                <SlidersHorizontal size={20} color="#0f172a" />
              </View>
              <Text className="text-slate-900 font-medium text-[15px]">Units</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-400 font-medium text-sm">Metric</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
          
          <View className="h-[1px] bg-slate-50 w-full" />

          {/* Row 3: Theme */}
          <TouchableOpacity className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center">
                <SunMoon size={20} color="#0f172a" />
              </View>
              <Text className="text-slate-900 font-medium text-[15px]">Theme</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-400 font-medium text-sm">System</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity 
          className="bg-slate-900 h-16 rounded-[24px] justify-center items-center shadow-lg mt-2 mb-10"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }}
        >
          <Text className="text-white font-bold text-lg">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
