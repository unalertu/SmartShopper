import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Sparkles, Zap, ShieldCheck, X, MapPin, Bell, Clock, SlidersHorizontal, List, PackagePlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSubscribe = () => {
    hapticNotification(Haptics.NotificationFeedbackType.Success);
    // In a real app, integrate revenuecat or native IAP here
    alert('Subscription flow would start here.');
  };

  const features = [
    {
      title: 'Unlimited Shopping Lists',
      description: 'Create as many lists as you need. Free: 5 lists.',
      icon: <List size={24} color="#D4AF37" />},
    {
      title: '500 Items Per List',
      description: 'Add up to 500 items per list. Free: 25 items.',
      icon: <PackagePlus size={24} color="#D4AF37" />},
    {
      title: '20 Saved Stores',
      description: 'Save up to 20 stores with geofence alerts. Free: 3 stores.',
      icon: <MapPin size={24} color="#D4AF37" />},
    {
      title: 'Unlimited Smart Alerts',
      description: 'No daily notification limits. Free: 5 per day.',
      icon: <Bell size={24} color="#D4AF37" />},
    {
      title: 'Custom Geofence Radius',
      description: 'Adjust radius from 50m to 1000m. Free: fixed 100m.',
      icon: <Zap size={24} color="#D4AF37" />},
    {
      title: 'Quiet Hours & Schedules',
      description: 'Mute notifications during set hours and schedule alerts.',
      icon: <Clock size={24} color="#D4AF37" />},
    {
      title: 'Smart Notification Rules',
      description: 'AI-powered alert filtering, priority alerts, and grouping.',
      icon: <Sparkles size={24} color="#D4AF37" />},
    {
      title: 'Advanced Notification Controls',
      description: 'Full control over notification behavior and preferences.',
      icon: <SlidersHorizontal size={24} color="#D4AF37" />},
    {
      title: 'Future Premium Features',
      description: 'Get every new premium feature as it launches.',
      icon: <ShieldCheck size={24} color="#D4AF37" />},
  ];

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      {/* Background Gradient Effect */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.1)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        className="absolute w-full h-full"
      />

      {/* Close Button */}
      <View
        className="absolute z-10 w-full flex-row justify-end"
        style={{ paddingTop: Math.max(insets.top, 20), paddingRight: 20 }}
      >
        <TouchableOpacity
          onPress={handleClose}
          className="h-8 w-8 rounded-full bg-slate-200/80 items-center justify-center"
        >
          <X size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24}}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Icon */}
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          className="items-center mb-6"
        >
          <View className="h-20 w-20 rounded-full bg-[#D4AF37]/10 items-center justify-center border border-[#D4AF37]/20">
            <Sparkles size={40} color="#D4AF37" fill="#D4AF37" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100).springify()}
          className="items-center mb-2"
        >
          <Text className="text-3xl font-extrabold text-slate-900 text-center">
            Unlock GeoCart <Text className="text-[#D4AF37]">Pro</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200).springify()}
          className="items-center mb-10"
        >
          <Text className="text-base text-slate-500 text-center px-4 leading-6">
            Supercharge your shopping experience with more stores, unlimited alerts, and full notification control.
          </Text>
        </Animated.View>

        {/* Features */}
        <View className="gap-4 mb-10">
          {features.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.duration(600)
                .delay(300 + index * 80)
                .springify()}
            >
              <View
                className="flex-row items-center p-4 rounded-3xl border border-slate-200 bg-white/60"
                style={{ overflow: 'hidden' }}
              >
                <BlurView
                  intensity={Platform.OS === 'ios' ? 20 : 60}
                  tint="light"
                  className="absolute w-full h-full"
                />
                <View className="h-12 w-12 rounded-2xl bg-[#D4AF37]/10 items-center justify-center mr-4 border border-[#D4AF37]/20">
                  {feature.icon}
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-base mb-1">
                    {feature.title}
                  </Text>
                  <Text className="text-slate-500 text-sm">
                    {feature.description}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Pricing Card */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(900).springify()}
          className="mb-8"
        >
          <LinearGradient
            colors={['#D4AF37', '#997a15']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-[2px]"
            style={{ borderRadius: 24 }}
          >
            <View className="bg-white p-5 items-center" style={{ borderRadius: 22 }}>
              <Text className="text-[#D4AF37] font-bold text-sm tracking-widest uppercase mb-2">
                Yearly Plan
              </Text>
              <View className="flex-row items-end mb-1">
                <Text className="text-4xl font-black text-slate-900">$29.99</Text>
                <Text className="text-slate-500 text-base mb-1 ml-1">/year</Text>
              </View>
              <Text className="text-slate-500 text-sm mt-1">
                Just $2.50 per month. Cancel anytime.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <Animated.View
        entering={FadeIn.duration(800).delay(1100)}
        className="absolute bottom-0 w-full px-6 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 24), paddingTop: 16 }}
      >
        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.8}
          className="w-full shadow-sm"
          style={{ borderRadius: 34 }}
        >
          <LinearGradient
            colors={['#D4AF37', '#B38B22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full"
            style={{ paddingVertical: 18, borderRadius: 34, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-[#1e1e1e] font-bold" style={{ fontSize: 18, lineHeight: 24, textAlign: 'center' }}>
              Start 7-Day Free Trial
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <View className="flex-row justify-center mt-4 gap-4">
          <TouchableOpacity>
            <Text className="text-slate-400 text-xs">Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text className="text-slate-400 text-xs">Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
              alert('Purchases Restored: Your Pro subscription has been successfully restored.');
            }}
          >
            <Text className="text-slate-400 text-xs">Restore</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
