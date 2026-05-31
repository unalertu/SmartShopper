import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  AppState,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useScrollToTop } from '@react-navigation/native';

import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ChevronRight,
  ChevronLeft,
  SunMoon,
  Navigation,
  SlidersHorizontal,
  Shield,
  FileText,
  Trash,
  Trash2,
  LifeBuoy,
  Star,
  Share as ShareIcon,
  MessageSquare,
  Info,
  Download,
  RefreshCw,
  Volume2,
  Vibrate,
  MapPin,
  Ruler,
  User,
  Crown,
  Globe,
  Users,
} from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import {
  useShoppingListStore,
  useLocationStore,
  useListsStore,
  useSettingsStore,
} from '../../store';
import type { ThemeOption } from '../../store';
import { hapticImpact, hapticNotification } from '../../services/haptics';
import * as Haptics from 'expo-haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';
import { NotificationFeedbackType } from 'expo-haptics';

// ─── Reusable Components ──────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  isDanger,
  rightElement,
  isLast,
}: {
  icon: React.ReactNode;
  iconBgColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  isDanger?: boolean;
  rightElement?: React.ReactNode;
  isFirst?: boolean;
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
          <Text
            className={`text-[15px] font-medium ${isDanger ? 'text-red-500' : 'text-slate-900'}`}
          >
            {label}
          </Text>
          {sublabel && (
            <Text className="text-[12px] text-slate-400 mt-0.5">{sublabel}</Text>
          )}
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        {rightElement ||
          (onPress && !isDanger && <ChevronRight size={20} color="#cbd5e1" />)}
      </View>
    </TouchableOpacity>
  );
}

function SettingsGroup({
  children,
  delay = 0,
}: {
  title?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      layout={LinearTransition.springify()}
      className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 shadow-sm mx-6"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
    >
      {children}
    </Animated.View>
  );
}

// ─── Label Maps ───────────────────────────────────────────────────────────────


const THEME_LABELS: Record<ThemeOption, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

// ─── Pro Status Card Memoized ────────────────────────────────────────────────
const ProStatusCard = React.memo(({ animatedStyle }: { animatedStyle: any }) => (
  <Animated.View style={animatedStyle}>
    <View
      className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex-row items-center"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="h-12 w-12 rounded-full bg-[#D4AF37]/10 items-center justify-center mr-4">
        <Crown size={24} color="#D4AF37" />
      </View>
      <View className="flex-1 justify-center">
        <View className="flex-row items-center mb-0.5 gap-2">
          <Text className="text-[17px] font-semibold text-slate-900 tracking-tight">SmartShopper</Text>
          <View className="bg-[#D4AF37]/10 px-1.5 py-0.5 rounded flex-row items-center border border-[#D4AF37]/20">
            <Text className="text-[#D4AF37] font-bold text-[9px] uppercase tracking-wider">
              Pro Aktif
            </Text>
          </View>
        </View>
        <Text className="text-[13px] text-slate-500">Tüm premium özellikler açık</Text>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </View>
  </Animated.View>
));
ProStatusCard.displayName = 'ProStatusCard';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Animated Values for Pro Card ──
  const scale = useSharedValue(1);

  const animatedProCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleProCardPressIn = () => {
    scale.value = withTiming(0.95, { duration: 150 });
  };

  const handleProCardPressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const handleProCardPress = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    router.push('/paywall');
  };

  // ── Store selectors ──
  const { clearAll: clearAllItems } = useShoppingListStore();

  const {
    notificationsEnabled,
    hapticEnabled,
    locationEnabled,
    distanceUnit,
    theme,
    setNotificationsEnabled,
    setHapticEnabled,
    setLocationEnabled,
    setDistanceUnit,
    setTheme,
    resetSettings,
  } = useSettingsStore();

  // ── Sync real notification status ──
  const syncNotificationStatus = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch {
      // Permission check failed (e.g. web/emulator), keep stored value
    }
  }, [setNotificationsEnabled]);

  // ── Sync real location status ──
  const syncLocationStatus = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
    } catch {
      // Permission check failed (e.g. web/emulator), keep stored value
    }
  }, [setLocationEnabled]);

  // Sync on mount + when app returns to foreground
  useEffect(() => {
    syncNotificationStatus();
    syncLocationStatus();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncNotificationStatus();
        syncLocationStatus();
      }
    });

    return () => subscription.remove();
  }, [syncNotificationStatus, syncLocationStatus]);

  // ── Switch styling ──
  const switchTrackColor = { false: '#e2e8f0', true: '#0f172a' };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleNotificationToggle = useCallback(
    async (value: boolean) => {
      hapticImpact(ImpactFeedbackStyle.Light);

      try {
        if (value) {
          const { status } = await Notifications.getPermissionsAsync();

          if (status === 'denied') {
            Alert.alert(
              'Notifications Disabled',
              'To enable notifications, please allow them in your device Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('app-settings:');
                    } else {
                      Linking.openSettings();
                    }
                  },
                },
              ]
            );
            return;
          }

          if (status === 'undetermined') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            setNotificationsEnabled(newStatus === 'granted');
            return;
          }

          setNotificationsEnabled(true);
        } else {
          Alert.alert(
            'Disable Notifications',
            'To turn off notifications, please go to your device Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
        }
      } catch {
        setNotificationsEnabled(value);
      }
    },
    [setNotificationsEnabled]
  );

  const handleLocationToggle = useCallback(
    async (value: boolean) => {
      hapticImpact(ImpactFeedbackStyle.Light);

      try {
        if (value) {
          const { status } = await Location.getForegroundPermissionsAsync();

          if (status === 'denied') {
            Alert.alert(
              'Location Disabled',
              'To enable location services, please allow them in your device Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('app-settings:');
                    } else {
                      Linking.openSettings();
                    }
                  },
                },
              ]
            );
            return;
          }

          if (status === 'undetermined') {
            const { status: newStatus } =
              await Location.requestForegroundPermissionsAsync();
            setLocationEnabled(newStatus === 'granted');
            return;
          }

          setLocationEnabled(true);
        } else {
          Alert.alert(
            'Disable Location',
            'To turn off location services, please go to your device Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
        }
      } catch {
        setLocationEnabled(value);
      }
    },
    [setLocationEnabled]
  );

  const handleDistanceUnitToggle = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    setDistanceUnit(distanceUnit === 'metric' ? 'imperial' : 'metric');
  }, [distanceUnit, setDistanceUnit]);

  const handleThemePick = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);

    const options: ThemeOption[] = ['system', 'light', 'dark'];
    Alert.alert('Theme', 'Choose the app color scheme.', [
      ...options.map((opt) => ({
        text: `${THEME_LABELS[opt]}${opt === theme ? '  ✓' : ''}`,
        onPress: () => {
          hapticImpact(ImpactFeedbackStyle.Light);
          setTheme(opt);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [theme, setTheme]);

  const handleResetApp = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Reset App',
      'This will permanently delete ALL your data — lists, items, saved locations, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All data will be lost forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Reset',
                  style: 'destructive',
                  onPress: () => {
                    // Clear all stores
                    clearAllItems();
                    useListsStore.getState().lists.forEach((list) => {
                      useListsStore.getState().removeList(list.id);
                    });
                    useLocationStore.getState().locations.forEach((loc) => {
                      useLocationStore.getState().removeLocation(loc.id);
                    });
                    resetSettings();
                    hapticNotification(NotificationFeedbackType.Warning);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [clearAllItems, resetSettings]);

  const handleShareApp = useCallback(async () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message:
          '📱 Check out SmartShopper — a smart shopping list app that reminds you near stores!\nhttps://smartshopper.app',
      });
    } catch {
      // User cancelled or share failed
    }
  }, []);

  const handleSendFeedback = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:feedback@smartshopper.app?subject=SmartShopper%20Feedback');
  }, []);

  const handleRateApp = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    // Placeholder App Store URL
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/smartshopper/id0000000000'
        : 'https://play.google.com/store/apps/details?id=com.smartshopper.app';
    Linking.openURL(storeUrl);
  }, []);

  const handleHelpCenter = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('https://smartshopper.app/help');
  }, []);

  const handleOpenSourceLicenses = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('https://smartshopper.app/licenses');
  }, []);

  const toggleWithHaptic = useCallback(
    (setter: (val: boolean) => void) => (val: boolean) => {
      hapticImpact(ImpactFeedbackStyle.Light);
      setter(val);
    },
    []
  );

  const handleHapticToggle = useCallback(
    (value: boolean) => {
      // Force a raw haptic impact so the user feels it when turning it on
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setHapticEnabled(value);
    },
    [setHapticEnabled]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AnimatedScreen>
      <View className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            layout={LinearTransition.springify()}
            className="flex-row items-center mx-6 mb-6"
          >
            <Text className="text-3xl font-bold text-slate-900">
              Settings
            </Text>
          </Animated.View>

          {/* SmartShopper Pro Card */}
          <Animated.View
            layout={LinearTransition.springify()}
            className="mx-6 mb-6"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={handleProCardPressIn}
              onPressOut={handleProCardPressOut}
              onPress={handleProCardPress}
            >
              <ProStatusCard animatedStyle={animatedProCardStyle} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Subscriptions & Purchases ── */}
          <SettingsGroup delay={50}>
            <SettingsRow
              icon={<Crown size={20} color="#D4AF37" />}
              label="SmartShopper Pro"
              sublabel="Unlock all premium features"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                router.push('/paywall');
              }}
            />
            <SettingsRow
              icon={<Users size={20} color="#64748b" />}
              label="Upgrade to Family Plan"
              sublabel="Share Pro with up to 5 members"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Alert.alert('Coming Soon', 'The Family Plan will be available in a future update.');
              }}
            />
            <SettingsRow
              icon={<RefreshCw size={20} color="#64748b" />}
              label="Restore Purchases"
              sublabel="Restore your Pro subscription"
              isLast
              rightElement={<View />}
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Heavy);
                Alert.alert('Purchases Restored', 'Your Pro subscription has been successfully restored.');
              }}
            />
          </SettingsGroup>

          {/* ── General Preferences ── */}
          <SettingsGroup delay={100}>
            <SettingsRow
              icon={<Globe size={20} color="#64748b" />}
              label="Language"
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">English</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }}
            />
            <SettingsRow
              icon={<SunMoon size={20} color="#64748b" />}
              label="Theme"
              onPress={handleThemePick}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">
                    {THEME_LABELS[theme]}
                  </Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
            <SettingsRow
              icon={<Ruler size={20} color="#64748b" />}
              label="Distance Unit"
              sublabel="Metric or Imperial"
              isLast
              onPress={handleDistanceUnitToggle}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">
                    {distanceUnit === 'metric' ? 'Metric' : 'Imperial'}
                  </Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
          </SettingsGroup>

          {/* ── Permissions & Device Settings ── */}
          <SettingsGroup delay={200}>
            <SettingsRow
              icon={<Bell size={20} color="#64748b" />}
              label="Push Notifications"
              sublabel="Get reminded near stores"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Navigation size={20} color="#64748b" />}
              label="Location Services"
              sublabel="Background geofencing"
              rightElement={
                <Switch
                  value={locationEnabled}
                  onValueChange={handleLocationToggle}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Vibrate size={20} color="#64748b" />}
              label="Haptic Feedback"
              sublabel="Vibrations on interactions"
              isLast
              rightElement={
                <Switch
                  value={hapticEnabled}
                  onValueChange={handleHapticToggle}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
          </SettingsGroup>

          {/* ── Support & Feedback ── */}
          <SettingsGroup delay={300}>
            <SettingsRow
              icon={<LifeBuoy size={20} color="#64748b" />}
              label="Help Center"
              sublabel="FAQ & troubleshooting"
              onPress={handleHelpCenter}
            />
            <SettingsRow
              icon={<MessageSquare size={20} color="#64748b" />}
              label="Send Feedback"
              sublabel="Report bugs or suggest features"
              onPress={handleSendFeedback}
            />
            <SettingsRow
              icon={<Star size={20} color="#64748b" />}
              label="Rate SmartShopper"
              sublabel="Leave a review on the App Store"
              onPress={handleRateApp}
            />
            <SettingsRow
              icon={<ShareIcon size={20} color="#64748b" />}
              label="Share with Friends"
              isLast
              onPress={handleShareApp}
            />
          </SettingsGroup>

          {/* ── Legal & About ── */}
          <SettingsGroup delay={400}>
            <SettingsRow
              icon={<Shield size={20} color="#64748b" />}
              label="Privacy Policy"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Linking.openURL('https://smartshopper.app/privacy');
              }}
            />
            <SettingsRow
              icon={<FileText size={20} color="#64748b" />}
              label="Terms of Service"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Linking.openURL('https://smartshopper.app/terms');
              }}
            />
            <SettingsRow
              icon={<FileText size={20} color="#64748b" />}
              label="Open Source Licenses"
              onPress={handleOpenSourceLicenses}
            />
            <SettingsRow
              icon={<Info size={20} color="#64748b" />}
              label="Version"
              isLast
              rightElement={
                <Text className="text-[13px] font-medium text-slate-400">1.0.0</Text>
              }
            />
          </SettingsGroup>

          {/* ── Danger Zone ── */}
          <SettingsGroup delay={500}>
            <SettingsRow
              icon={<Trash size={20} color="#ef4444" />}
              label="Reset App"
              sublabel="Delete all data and start fresh"
              isDanger
              isLast
              onPress={handleResetApp}
            />
          </SettingsGroup>

          {/* Footer */}
          <Animated.View
            layout={LinearTransition.springify()}
            className="items-center mb-4"
          >
            <Text className="text-[12px] font-medium text-slate-300 tracking-wide">
              Made with ❤️ in Istanbul
            </Text>
            <Text className="text-[11px] font-medium text-slate-300 mt-1">
              SmartShopper © 2026
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}
