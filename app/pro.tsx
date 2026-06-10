import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Crown,
  Zap,
  ShieldCheck,
  CalendarDays,
  ExternalLink,
  MapPin,
  Bell,
  Clock,
  SlidersHorizontal,
  List,
  PackagePlus,
  Check,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../services/haptics';

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

// ─── Management Row ────────────────────────────────────────────────────────────

function ManagementRow({
  icon,
  label,
  sublabel,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      className={`flex-row justify-between items-center py-3 px-1 ${!isLast ? 'border-b border-slate-50' : ''}`}
    >
      <View className="flex-row items-center flex-1 pr-4">
        {icon}
        <View className="ml-3 flex-shrink">
          <Text className="text-[15px] font-medium text-slate-900">{label}</Text>
          {sublabel && (
            <Text className="text-[12px] text-slate-400 mt-0.5">{sublabel}</Text>
          )}
        </View>
      </View>
      {onPress && <ChevronRight size={18} color="#cbd5e1" />}
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const features = [
    { icon: <List size={16} color="#D4AF37" />, title: 'Unlimited Shopping Lists' },
    { icon: <PackagePlus size={16} color="#D4AF37" />, title: '500 Items Per List' },
    { icon: <MapPin size={16} color="#D4AF37" />, title: '20 Saved Stores' },
    { icon: <Bell size={16} color="#D4AF37" />, title: 'Unlimited Smart Alerts' },
    { icon: <Zap size={16} color="#D4AF37" />, title: 'Custom Geofence Radius' },
    { icon: <Clock size={16} color="#D4AF37" />, title: 'Quiet Hours & Schedules' },
    { icon: <Sparkles size={16} color="#D4AF37" />, title: 'Smart Notification Rules' },
    { icon: <SlidersHorizontal size={16} color="#D4AF37" />, title: 'Advanced Controls' },
    { icon: <ShieldCheck size={16} color="#D4AF37" />, title: 'All Future Features' },
  ];

  const handleManageSubscription = () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const handleCancelSubscription = () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Cancel Subscription',
      'You can manage or cancel your subscription through your device\'s subscription settings. Your Pro benefits will remain active until the end of your current billing period.',
      [
        { text: 'Keep Pro', style: 'cancel' },
        {
          text: 'Manage Subscription',
          onPress: handleManageSubscription,
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      {/* Background Gradient Effect */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        className="absolute w-full h-full"
      />

      {/* Header Back Button */}
      <View
        className="absolute z-10 w-full flex-row"
        style={{ paddingTop: Math.max(insets.top, 20), paddingLeft: 20 }}
      >
        <TouchableOpacity
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="h-8 w-8 rounded-full bg-slate-200/80 items-center justify-center"
        >
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingTop: insets.top + 60,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          className="items-center mb-6"
        >
          <Text className="text-3xl font-extrabold text-slate-900">
            GeoCart <Text className="text-[#D4AF37]">Pro</Text>
          </Text>
        </Animated.View>

        {/* Status Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100).springify()}
          className="mb-8"
        >
          <LinearGradient
            colors={['#D4AF37', '#B38B22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: 20 }}
          >
            <View className="flex-row items-center mb-4" style={{ paddingHorizontal: 6 }}>
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center mr-4">
                <Crown size={28} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1.5">
                  <Text className="text-white font-bold text-[18px]">Pro Active</Text>
                  <View className="bg-white/20 px-2.5 py-1 rounded-full">
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wider">
                      Premium
                    </Text>
                  </View>
                </View>
                <Text className="text-white/70 text-[14px]">
                  All premium features unlocked
                </Text>
              </View>
            </View>

            <View className="bg-white/10 rounded-2xl p-3.5 flex-row items-center" style={{ marginHorizontal: 6 }}>
              <CalendarDays size={16} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-[13px] ml-2.5">
                Yearly Plan • Renews annually
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Included Features */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(200).springify()}
          className="mb-2"
        >
          <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider ml-2 mb-2">
            Included Features
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(250).springify()}
          className="bg-white border border-slate-100 rounded-3xl mb-8 px-5 py-2"
        >
          {features.map((feature, index) => (
            <View
              key={index}
              className={index < features.length - 1 ? 'border-b border-slate-50' : ''}
            >
              <FeatureRow
                icon={feature.icon}
                title={feature.title}
                delay={300 + index * 40}
              />
            </View>
          ))}
        </Animated.View>

        {/* Manage Subscription */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500).springify()}
          className="mb-2"
        >
          <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider ml-2 mb-2">
            Manage
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(550).springify()}
          className="bg-white border border-slate-100 rounded-3xl mb-8 px-4 py-2"
        >
          <ManagementRow
            icon={<CreditCard size={20} color="#64748b" />}
            label="Manage Subscription"
            sublabel="Change plan or payment method"
            onPress={handleManageSubscription}
          />
          <ManagementRow
            icon={<ExternalLink size={20} color="#64748b" />}
            label="View Receipt"
            sublabel="View your purchase history"
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              handleManageSubscription();
            }}
          />
          <ManagementRow
            icon={<Sparkles size={20} color="#ef4444" />}
            label="Cancel Subscription"
            sublabel="Your benefits last until the billing period ends"
            isLast
            onPress={handleCancelSubscription}
          />
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(650).springify()}
          className="items-center mt-2 mb-4"
        >
          <Text className="text-[12px] text-slate-300 text-center">
            Thank you for supporting GeoCart ✨
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
