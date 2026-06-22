import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  AppState,
  Share} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useScrollToTop } from '@react-navigation/native';

import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTabBarScrollHandler } from '../../hooks/useTabBarScroll';
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
  RotateCcw,
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
  Sparkles,
  Globe,
  Users,
  Calendar,
  Bug} from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { geoEngine } from '../../services/geoEngine';
import { notificationEngine } from '../../services/notificationEngine';
import { sendLocalNotification } from '../../services/notificationService';
import {
  useShoppingListStore,
  useLocationStore,
  useListsStore,
  useSettingsStore,
  useNotificationsStore} from '../../store';
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
  isLast}: {
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
          (onPress && !isDanger && <ChevronRight size={16} color="#94a3b8" />)}
      </View>
    </TouchableOpacity>
  );
}

function SettingsGroup({
  children,
  delay = 0}: {
  title?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay).springify()}
      layout={LinearTransition.springify()}
      className="bg-white border border-slate-100 rounded-3xl p-2 mb-6 mx-6"
      
    >
      {children}
    </Animated.View>
  );
}

// ─── Label Maps ───────────────────────────────────────────────────────────────


const THEME_LABELS: Record<ThemeOption, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark'};

// ─── Pro Status Card Memoized ────────────────────────────────────────────────
const ProStatusCard = React.memo(({ animatedStyle, isPro }: { animatedStyle: any; isPro: boolean }) => (
  <Animated.View style={animatedStyle}>
    <View
      className="bg-white border border-slate-100 rounded-3xl px-4 py-4 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-[24px] font-semibold text-slate-900 tracking-tight">Plan</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className={`${isPro ? 'bg-[#D4AF37]/15' : 'bg-[#0f172a]/10'} px-3 py-1 rounded-full flex-row items-center`}>
          <Text className={`${isPro ? 'text-[#D4AF37]' : 'text-[#0f172a]'} font-medium text-[11px] uppercase tracking-wider`}>
            {isPro ? 'Pro Active' : 'Free'}
          </Text>
        </View>
        <ChevronRight size={16} color="#94a3b8" />
      </View>
    </View>
  </Animated.View>
));
ProStatusCard.displayName = 'ProStatusCard';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const scrollRef = useRef<Animated.ScrollView>(null);
  useScrollToTop(scrollRef as any);
  const scrollHandler = useTabBarScrollHandler();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Store selectors ──
  const { clearAll: clearAllItems } = useShoppingListStore();

  const {
    notificationsEnabled,
    hapticEnabled,
    locationEnabled,
    distanceUnit,
    theme,
    isPro,
    setNotificationsEnabled,
    setHapticEnabled,
    setLocationEnabled,
    setDistanceUnit,
    setTheme,
    resetSettings} = useSettingsStore();

  // ── Animated Values for Pro Card ──
  const scale = useSharedValue(1);

  const animatedProCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]};
  });

  const handleProCardPressIn = () => {
    scale.value = withTiming(0.95, { duration: 150 });
  };

  const handleProCardPressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const handleProCardPress = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    if (isPro) {
      router.push('/pro');
    } else {
      router.push('/paywall');
    }
  };


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
                  }},
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
                }},
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
                  }},
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
                }},
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
        }})),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [theme, setTheme]);

  const handleResetApp = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Are you sure?',
      'This will permanently delete:\n\n• Saved Lists\n• Saved Shops\n• Notifications\n• Preferences\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Clear all shopping items
            clearAllItems();
            // Clear all lists
            const listsState = useListsStore.getState();
            listsState.lists.forEach((list) => {
              listsState.removeList(list.id);
            });
            // Clear all saved locations & cached markets
            const locState = useLocationStore.getState();
            locState.locations.forEach((loc) => {
              locState.removeLocation(loc.id);
            });
            locState.setCachedMarkets([]);
            // Clear all notifications
            useNotificationsStore.getState().clearAll();
            // Reset settings (preserves isPro)
            resetSettings();
            hapticNotification(NotificationFeedbackType.Warning);
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
          '📱 Check out GeoCart — a smart shopping list app that reminds you near stores!\nhttps://geocart.app'});
    } catch {
      // User cancelled or share failed
    }
  }, []);

  const handleSendFeedback = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:feedback@geocart.app?subject=GeoCart%20Feedback');
  }, []);

  const handleRateApp = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    // Placeholder App Store URL
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/geocart/id0000000000'
        : 'https://play.google.com/store/apps/details?id=com.geocart.app';
    Linking.openURL(storeUrl);
  }, []);

  const handleHelpCenter = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('https://geocart.app/help');
  }, []);

  const handleOpenSourceLicenses = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    Linking.openURL('https://geocart.app/licenses');
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

  const handleTestNotification = useCallback(async () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      
      const nearbyStores = await geoEngine.getNearbyStores(lat, lon, false);
      if (nearbyStores.length === 0) {
        Alert.alert("Test Flow", "No stores nearby to trigger the flow. Try adding one nearby first.");
        return;
      }
      
      const bestStore = nearbyStores[0];
      const content = notificationEngine.buildNotificationContent(bestStore.name);
      await sendLocalNotification(content.title, content.body, "geofence-alerts");
      
      console.log(`[TEST] Manually triggered test notification for ${bestStore.name}`);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to trigger test flow. Please ensure location permissions are granted.");
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AnimatedScreen>
      <View className="flex-1 bg-[#F2F2F7]">
        <StatusBar style="dark" />

        <Animated.ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 8 }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            layout={LinearTransition.springify()}
            className="flex-row items-center mx-6 mb-6"
          >
            <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>
              Settings
            </Text>
          </Animated.View>

          {/* GeoCart Pro Card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(25).springify()}
            layout={LinearTransition.springify()}
            className="mx-6 mb-6"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={handleProCardPressIn}
              onPressOut={handleProCardPressOut}
              onPress={handleProCardPress}
            >
              <ProStatusCard animatedStyle={animatedProCardStyle} isPro={isPro} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Debug ── */}
          <SettingsGroup delay={35}>
            <SettingsRow
              icon={<Bug size={20} color="#8b5cf6" />}
              label="Test Notification Flow"
              sublabel="Immediately trigger store detection and send notification"
              onPress={handleTestNotification}
            />
            <SettingsRow
              icon={<MapPin size={20} color="#8b5cf6" />}
              label="Location Debugger"
              sublabel="View real-time location and dwell timers"
              isLast
              onPress={() => router.push('/debug')}
            />
          </SettingsGroup>

          {/* ── Subscriptions & Purchases ── */}
          <SettingsGroup delay={50}>
            {!isPro && (
              <SettingsRow
                icon={<Sparkles size={20} color="#D4AF37" />}
                label="GeoCart Pro"
                sublabel="Unlock all premium features"
                onPress={() => {
                  hapticImpact(ImpactFeedbackStyle.Light);
                  router.push('/paywall');
                }}
              />
            )}

            {isPro ? (
              <SettingsRow
                icon={<Users size={20} color="#64748b" />}
                label="Upgrade to Family Plan"
                sublabel="Share Pro with up to 5 members"
                onPress={() => {
                  hapticImpact(ImpactFeedbackStyle.Light);
                  Alert.alert('Coming Soon', 'The Family Plan will be available in a future update.');
                }}
              />
            ) : (
              <SettingsRow
                icon={<Users size={20} color="#64748b" />}
                label="Family Plan"
                sublabel="Coming soon"
                onPress={() => {
                  hapticImpact(ImpactFeedbackStyle.Light);
                  Alert.alert('Coming Soon', 'The Family Plan will be available in a future update.');
                }}
              />
            )}
            <SettingsRow
              icon={<Calendar size={20} color="#64748b" />}
              label="Calendar & Reminders"
              sublabel="Coming in future updates"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Alert.alert('Coming Soon', 'Calendar and reminders integration will be available in future updates.');
              }}
            />
            <SettingsRow
              icon={<RefreshCw size={20} color="#64748b" />}
              label="Restore Purchases"
              isLast
              rightElement={<View />}
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Heavy);
                Alert.alert('Purchases Restored', 'Your Pro subscription has been successfully restored.');
              }}
            />
          </SettingsGroup>

          {/* ── Preferences & Device Settings ── */}
          <SettingsGroup delay={100}>
            <SettingsRow
              icon={<Ruler size={20} color="#64748b" />}
              label="Distance Unit"
              onPress={handleDistanceUnitToggle}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">
                    {distanceUnit === 'metric' ? 'Metric' : 'Imperial'}
                  </Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </View>
              }
            />
            <SettingsRow
              icon={<SlidersHorizontal size={20} color="#64748b" />}
              label="Map & Notifications"
              sublabel="Customize map and alerts"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                router.push('/notification-preferences');
              }}
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
              rightElement={
                <Switch
                  value={hapticEnabled}
                  onValueChange={handleHapticToggle}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Bell size={20} color="#64748b" />}
              label="Push Notifications"
              sublabel="Get reminded near stores"
              isLast
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
          </SettingsGroup>

          {/* ── Support & Feedback ── */}
          <SettingsGroup delay={200}>
            <SettingsRow
              icon={<LifeBuoy size={20} color="#64748b" />}
              label="Help Center"
              onPress={handleHelpCenter}
            />
            <SettingsRow
              icon={<MessageSquare size={20} color="#64748b" />}
              label="Send Feedback"
              onPress={handleSendFeedback}
            />
            <SettingsRow
              icon={<Star size={20} color="#64748b" />}
              label="Rate GeoCart"
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
          <SettingsGroup delay={300}>
            <SettingsRow
              icon={<Shield size={20} color="#64748b" />}
              label="Privacy Policy"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Linking.openURL('https://geocart.app/privacy');
              }}
            />
            <SettingsRow
              icon={<FileText size={20} color="#64748b" />}
              label="Terms of Service"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                Linking.openURL('https://geocart.app/terms');
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
          <SettingsGroup delay={400}>
            <SettingsRow
              icon={<RotateCcw size={20} color="#ef4444" />}
              label="Reset App Data"
              sublabel="Delete all saved lists, shops, notifications and preferences"
              isDanger
              isLast
              onPress={handleResetApp}
            />
          </SettingsGroup>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(500).springify()}
            layout={LinearTransition.springify()}
            className="items-center mb-4"
          >
            <Text className="text-[12px] font-medium text-slate-300 tracking-wide text-center">
              Your memory at the supermarket
            </Text>
            <Text className="text-[11px] font-medium text-slate-300 mt-1 text-center">
              Crafted by a solo student developer
            </Text>
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </AnimatedScreen>
  );
}
