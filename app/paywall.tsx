import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  X,
  MapPin,
  Bell,
  Clock,
  SlidersHorizontal,
  List,
  PackagePlus,
  Crown,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification } from '../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Feature Row (compact) ─────────────────────────────────────────────────────

function FeatureRow({ icon, title, delay }: { icon: React.ReactNode; title: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay).springify()}
      className="flex-row items-center py-3"
    >
      <View className="h-8 w-8 rounded-xl bg-[#D4AF37]/10 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-[15px] font-medium text-slate-800 flex-1">{title}</Text>
      <Check size={16} color="#D4AF37" strokeWidth={3} />
    </Animated.View>
  );
}

// ─── Plan Option ───────────────────────────────────────────────────────────────

function PlanOption({
  label,
  price,
  period,
  subtitle,
  isSelected,
  onPress,
  badge,
}: {
  label: string;
  price: string;
  period: string;
  subtitle: string;
  isSelected: boolean;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-1 p-4 rounded-2xl border-2 bg-white ${
        isSelected ? 'border-[#D4AF37]' : 'border-slate-100'
      }`}
    >
      {badge && (
        <View className="absolute -top-4 right-2 bg-[#D4AF37] px-3 py-1 rounded-full">
          <Text className="text-[13px] font-bold text-white uppercase tracking-wider">{badge}</Text>
        </View>
      )}
      <Text className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
        isSelected ? 'text-[#D4AF37]' : 'text-slate-400'
      }`}>{label}</Text>
      <View className="flex-row items-end mb-0.5">
        <Text className={`text-2xl font-black ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{price}</Text>
        <Text className="text-slate-400 text-xs mb-0.5 ml-0.5">/{period}</Text>
      </View>
      <Text className="text-slate-400 text-[11px]">{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  // Pricing Logic
  const monthlyPrice = 1.99;
  const yearlyPrice = 19.99;
  const savingsPercent = Math.round((1 - (yearlyPrice / (monthlyPrice * 12))) * 100);
  const monthlyEquivalent = (yearlyPrice / 12).toFixed(2);

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
    { icon: <List size={16} color="#D4AF37" />, title: 'Unlimited Shopping Lists' },
    { icon: <PackagePlus size={16} color="#D4AF37" />, title: '500 Items Per List' },
    { icon: <MapPin size={16} color="#D4AF37" />, title: '20 Saved Stores' },
    { icon: <Bell size={16} color="#D4AF37" />, title: 'Unlimited Notifications' },
    { icon: <Zap size={16} color="#D4AF37" />, title: 'Custom Geofence Radius' },
    { icon: <Clock size={16} color="#D4AF37" />, title: 'Quiet Hours & Schedules' },
    { icon: <SlidersHorizontal size={16} color="#D4AF37" />, title: 'Advanced Controls' },
    { icon: <ShieldCheck size={16} color="#D4AF37" />, title: 'All Future Features' },
  ];

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      {/* Subtle top glow */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
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
          <X size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Icon */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          className="items-center mb-5"
        >
          <View className="h-20 w-20 rounded-full items-center justify-center">
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.03)']}
              className="absolute w-full h-full rounded-full"
            />
            <Sparkles size={36} color="#D4AF37" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(80).springify()}
          className="items-center mb-2"
        >
          <Text className="text-[28px] font-extrabold text-slate-900 text-center tracking-tight">
            Upgrade to <Text className="text-[#D4AF37]">Pro</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(150).springify()}
          className="items-center mb-8"
        >
          <Text className="text-[15px] text-slate-400 text-center leading-[22px] px-2">
            Unlock the full potential of GeoCart with{'\n'}unlimited lists, stores, and smart alerts.
          </Text>
        </Animated.View>

        {/* Features Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(220).springify()}
          className="bg-white border border-slate-100 rounded-3xl px-5 py-2 mb-6"
        >
          {features.map((feature, index) => (
            <View
              key={index}
              className={index < features.length - 1 ? 'border-b border-slate-50' : ''}
            >
              <FeatureRow
                icon={feature.icon}
                title={feature.title}
                delay={280 + index * 40}
              />
            </View>
          ))}
        </Animated.View>


      </ScrollView>

      {/* Fixed Bottom CTA */}
      <Animated.View
        entering={FadeIn.duration(600).delay(800)}
        className="absolute bottom-0 w-full px-6 bg-[#F2F2F7]"
        style={{ paddingBottom: Math.max(insets.bottom, 24), paddingTop: 16 }}
      >
        {/* Subtle fade overlay behind CTA */}
        <LinearGradient
          colors={['transparent', '#F2F2F7']}
          className="absolute -top-8 left-0 right-0 h-8"
        />
        <View className="flex-row gap-3 w-full mb-4">
          <PlanOption
            label="Monthly"
            price={`$${monthlyPrice}`}
            period="month"
            subtitle="Billed monthly"
            isSelected={selectedPlan === 'monthly'}
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('monthly');
            }}
          />
          <PlanOption
            label="Yearly"
            price={`$${yearlyPrice}`}
            period="year"
            subtitle={`$${monthlyEquivalent}/mo · Save ${savingsPercent}%`}
            isSelected={selectedPlan === 'yearly'}
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('yearly');
            }}
            badge={`Save ${savingsPercent}%`}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.85}
          className="w-full"
          style={{ borderRadius: 30 }}
        >
          <LinearGradient
            colors={['#D4AF37', '#B38B22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full"
            style={{
              paddingVertical: 18,
              borderRadius: 30,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="text-white font-bold" style={{ fontSize: 17 }}>
              Continue with {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <View className="flex-row justify-center mt-3.5 gap-4">
          <TouchableOpacity>
            <Text className="text-slate-500 text-[11px] font-medium">Terms</Text>
          </TouchableOpacity>
          <Text className="text-slate-400 text-[11px]">·</Text>
          <TouchableOpacity>
            <Text className="text-slate-500 text-[11px] font-medium">Privacy</Text>
          </TouchableOpacity>
          <Text className="text-slate-400 text-[11px]">·</Text>
          <TouchableOpacity
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
              alert('Purchases Restored: Your Pro subscription has been successfully restored.');
            }}
          >
            <Text className="text-slate-500 text-[11px] font-medium">Restore</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
