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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Crown,
  Zap,
  ShieldCheck,
  Users,
  Cloud,
  Infinity,
  CheckCircle2,
  CreditCard,
  CalendarDays,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../services/haptics';
import { useSettingsStore } from '../store';

// ─── Feature Item ──────────────────────────────────────────────────────────────

function FeatureItem({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(delay).springify()}
      className="flex-row items-center p-4"
    >
      <View className="h-10 w-10 rounded-2xl bg-[#D4AF37]/10 items-center justify-center mr-4 border border-[#D4AF37]/20">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-slate-900">{title}</Text>
        <Text className="text-[12px] text-slate-400 mt-0.5">{description}</Text>
      </View>
      <CheckCircle2 size={18} color="#D4AF37" />
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
      className={`flex-row justify-between items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}
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
    {
      icon: <Infinity size={20} color="#D4AF37" />,
      title: 'Unlimited Lists & Items',
      description: 'No limits on how many lists you can create',
    },
    {
      icon: <Zap size={20} color="#D4AF37" />,
      title: 'Smart Location Alerts',
      description: 'Get notified when you are near a store',
    },
    {
      icon: <Cloud size={20} color="#D4AF37" />,
      title: 'Cloud Sync & Backup',
      description: 'Sync across all your devices seamlessly',
    },
    {
      icon: <ShieldCheck size={20} color="#D4AF37" />,
      title: 'Priority Support',
      description: 'Get help faster with priority access',
    },
    {
      icon: <Users size={20} color="#D4AF37" />,
      title: 'Family Sharing (Coming Soon)',
      description: 'Share Pro with up to 5 family members',
    },
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
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
        className="absolute w-full h-full"
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingTop: insets.top + 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          className="flex-row items-center mx-6 mb-6"
        >
          <TouchableOpacity
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="mr-3 h-10 w-10 rounded-full bg-white border border-slate-100 items-center justify-center"
          >
            <ChevronLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-slate-900">SmartShopper Pro</Text>
        </Animated.View>

        {/* Status Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100).springify()}
          className="mx-6 mb-6"
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
          className="mx-6 mb-2"
        >
          <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider ml-2 mb-2">
            Included Features
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(250).springify()}
          className="bg-white border border-slate-100 rounded-3xl mx-6 mb-6 p-2"
        >
          {features.map((feature, index) => (
            <View
              key={index}
              className={index < features.length - 1 ? 'border-b border-slate-50' : ''}
            >
              <FeatureItem
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={300 + index * 60}
              />
            </View>
          ))}
        </Animated.View>

        {/* Manage Subscription */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500).springify()}
          className="mx-6 mb-2"
        >
          <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider ml-2 mb-2">
            Manage
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(550).springify()}
          className="bg-white border border-slate-100 rounded-3xl mx-6 mb-6 p-2"
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
            Thank you for supporting SmartShopper ✨
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
