import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  User, 
  Bell, 
  SlidersHorizontal, 
  SunMoon, 
  ChevronRight,
  LifeBuoy,
  Star,
  Share,
  Shield,
  FileText,
  Trash,
  Settings,
  Navigation
} from 'lucide-react-native';

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
          className="bg-white border border-slate-100 rounded-3xl p-4 mb-4 flex-row items-center shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
        >
          {/* Avatar */}
          <View className="bg-slate-100 h-16 w-16 rounded-full justify-center items-center mr-4">
            <User size={32} color="#94a3b8" strokeWidth={1.5} />
          </View>

          {/* User Info & Edit */}
          <View className="flex-col flex-1 justify-center">
            <Text className="text-lg font-bold text-slate-900 mb-0.5">Arda</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-sm text-slate-500 mb-0">test@gmail.com</Text>
              <TouchableOpacity className="p-1.5 rounded-full bg-slate-100 ml-2">
                <Settings size={14} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Subscription Info Card */}
        <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-6 flex-row items-center justify-between shadow-sm">
          <Text className="text-slate-900 font-bold text-sm">Subscription Tier</Text>
          <View className="bg-slate-900 px-3 py-1 rounded-full">
            <Text className="text-white font-bold text-[10px] uppercase tracking-widest">PRO Plan</Text>
          </View>
        </View>

        {/* Card 1: Preferences */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
        >
          {/* Notifications */}
          <View className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <Bell size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e2e8f0', true: '#0f172a' }}
              thumbColor={'#ffffff'}
            />
          </View>

          {/* Location Services */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <Navigation size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Location Services</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
          
          {/* Units */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <SlidersHorizontal size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Units</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-slate-400 font-medium text-sm">Metric</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>

          {/* Theme */}
          <TouchableOpacity className="flex-row justify-between items-center p-4">
            <View className="flex-row items-center">
              <SunMoon size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Theme</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-slate-400 font-medium text-sm">System</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 2: Support & Feedback */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
        >
          {/* Help Center */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <LifeBuoy size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Help Center</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
          
          {/* Rate App */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <Star size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Rate App</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Share with Friends */}
          <TouchableOpacity className="flex-row justify-between items-center p-4">
            <View className="flex-row items-center">
              <Share size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Share with Friends</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Card 3: Account & Legal */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
        >
          {/* Privacy Policy */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <Shield size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
          
          {/* Terms of Service */}
          <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <FileText size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity className="flex-row justify-between items-center p-4">
            <View className="flex-row items-center">
              <Trash size={20} color="#ef4444" />
              <Text className="text-red-500 font-medium ml-3 text-[15px]">Delete Account</Text>
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
