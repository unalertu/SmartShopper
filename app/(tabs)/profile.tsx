import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Linking, Platform, AppState } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import { 
  User, 
  Bell, 
  SunMoon, 
  ChevronRight,
  LifeBuoy,
  Star,
  Share,
  Shield,
  FileText,
  Trash,
  Navigation,
  Sparkles,
  ShoppingCart,
  MapPin,
  MessageSquare,
  Info,
  Lock} from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import NotificationPermissionSheet from '../../components/NotificationPermissionSheet';
import { useSettingsStore } from '../../store/useSettingsStore';
import { showPaywall } from "@/services/paywallService";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notificationsEnabled, setNotificationsEnabled, theme, isPro } = useSettingsStore();
  const [notificationSheetVisible, setNotificationSheetVisible] = useState(false);
  const [isTurningOffNotification, setIsTurningOffNotification] = useState(false);

  // Check notification permission on mount + whenever app returns from background
  useEffect(() => {
    checkNotificationStatus();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkNotificationStatus();
      }
    });

    return () => subscription.remove();
  }, []);

  const checkNotificationStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }, []);

  const handleNotificationToggle = useCallback(async (value: boolean) => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    setIsTurningOffNotification(!value);
    setNotificationSheetVisible(true);
  }, []);

  return (
    <AnimatedScreen>
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingTop: insets.top + 16, 
          paddingHorizontal: 24,
          paddingBottom: 100
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="text-3xl font-bold text-slate-900 mb-6">Settings</Text>

        {/* Account */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-4 mb-4 flex-row items-center shadow-sm"
          
        >
          <View className="bg-slate-100 h-16 w-16 rounded-full justify-center items-center mr-4 overflow-hidden">
            {isPro ? (
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?u=arda' }} 
                style={{ width: '100%', height: '100%' }} 
                transition={null} 
                cachePolicy="memory-disk"
              />
            ) : (
              <User size={32} color="#94a3b8" />
            )}
          </View>
          <View className="flex-col flex-1 justify-center">
            <Text className="text-lg font-bold text-slate-900 mb-0.5">Arda</Text>
            <Text className="text-sm text-slate-500">test@gmail.com</Text>
          </View>
          <ChevronRight size={20} color="#cbd5e1" />
        </View>

        {/* Premium */}
        <TouchableOpacity 
          className="bg-slate-900 rounded-3xl p-4 mb-6 flex-row items-center justify-between shadow-sm"
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
            if (isPro) {
              router.push('/pro');
            } else {
              showPaywall();
            }
          }}
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <View className="bg-[#D4AF37] h-10 w-10 rounded-full justify-center items-center mr-3">
              <Sparkles size={20} color="#1e1e1e" fill="#1e1e1e" />
            </View>
            <View>
              <Text className="text-white font-bold text-[15px]">Premium</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Upgrade for unlimited features</Text>
            </View>
          </View>
          <View className="bg-[#D4AF37] px-3 py-1 rounded-full">
            <Text className="text-[#1e1e1e] font-bold text-[10px] uppercase tracking-widest">PRO</Text>
          </View>
        </TouchableOpacity>

        {/* Card 1: Notifications & Location */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          
        >
          {/* Notifications */}
          <View className="flex-row justify-between items-center p-4 border-b border-slate-50">
            <View className="flex-row items-center">
              <Bell size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#cbd5e1', true: '#0f172a' }}
              ios_backgroundColor="#cbd5e1"
              thumbColor={'#ffffff'}
            />
          </View>

          {/* Location & Background */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <MapPin size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Location & Background</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Card 2: Shopping Preferences & Appearance */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          
        >
          {/* Shopping Preferences */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-slate-50"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <ShoppingCart size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Shopping Preferences</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Appearance */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <SunMoon size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Appearance</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-slate-400 font-medium text-sm capitalize">{theme}</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 3: Privacy & Data */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          
        >
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <Lock size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Privacy & Data</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Card 4: Help & Support, Feedback */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          
        >
          {/* Help & Support */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-slate-50"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <LifeBuoy size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Help & Support</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Feedback */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <MessageSquare size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Feedback</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Card 5: Legal & About */}
        <View 
          className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm"
          
        >
          {/* Legal */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-slate-50"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <FileText size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">Legal</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <View className="flex-row items-center">
              <Info size={20} color="#64748b" />
              <Text className="text-slate-900 font-medium ml-3 text-[15px]">About</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-slate-400 font-medium text-sm">v1.0.0</Text>
              <ChevronRight size={20} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>


      </ScrollView>

      <NotificationPermissionSheet
        visible={notificationSheetVisible}
        onDismiss={() => setNotificationSheetVisible(false)}
        onGranted={() => setNotificationsEnabled(true)}
        isTurningOff={isTurningOffNotification}
      />
    </View>
    </AnimatedScreen>
  );
}
