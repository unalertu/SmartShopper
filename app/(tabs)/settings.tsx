import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
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
  Share,
  MessageSquare,
  Info,
  Download,
  RefreshCw,
  Volume2,
  Fingerprint,
  Languages,
  Ruler,
  Vibrate,
  MapPin,
} from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useShoppingListStore, useLocationStore, useListsStore } from '../../store';

// Reusable row component matching the app's card style
function SettingsRow({
  icon,
  iconBgColor,
  label,
  sublabel,
  onPress,
  isDanger,
  rightElement,
  isFirst,
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
      className="flex-row items-center py-3.5 px-4"
      style={{
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <View 
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: iconBgColor || '#f1f5f9' }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-medium ${isDanger ? 'text-red-500' : 'text-slate-900'} tracking-tight`}
        >
          {label}
        </Text>
        {sublabel && (
          <Text className="text-[12px] text-slate-400 mt-0.5 font-medium">{sublabel}</Text>
        )}
      </View>
      {rightElement || (onPress && !isDanger && (
        <ChevronRight size={18} color="#cbd5e1" />
      ))}
    </TouchableOpacity>
  );
}

// Grouped card container
function SettingsGroup({ 
  title, 
  children, 
  delay = 0 
}: { 
  title?: string; 
  children: React.ReactNode; 
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      layout={LinearTransition.springify()}
      className="mx-6 mb-5"
    >
      {title && (
        <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-2 ml-1">
          {title}
        </Text>
      )}
      <View
        className="bg-white rounded-[20px] overflow-hidden border border-slate-200"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, clearPurchased, clearAll } = useShoppingListStore();
  const { locations } = useLocationStore();
  const { lists } = useListsStore();

  const purchasedCount = items.filter((i) => i.isPurchased).length;

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(true);
  const [autoDeletePurchased, setAutoDeletePurchased] = useState(false);

  const handleClearPurchased = () => {
    if (purchasedCount === 0) {
      Alert.alert('No Items', 'There are no purchased items to clear.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Purchased Items',
      `Remove ${purchasedCount} purchased item${purchasedCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearPurchased },
      ]
    );
  };

  const handleClearAll = () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'There are no items to clear.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Clear All Items',
      'This will remove all items from your shopping list. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const handleResetApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Reset App',
      'This will delete all your data including lists, items, and saved locations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive', 
          onPress: () => {
            clearAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      ]
    );
  };

  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Export Data', 'Your data export has been prepared. This feature is coming soon.');
  };

  const toggleWithHaptic = (setter: (val: boolean) => void) => (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(val);
  };

  const switchTrackColor = { false: '#e2e8f0', true: '#0f172a' };

  return (
    <AnimatedScreen>
      <View className="flex-1 bg-slate-50">
        <StatusBar style="dark" />
        
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 8 }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back Button */}
          <Animated.View 
            entering={FadeInDown.duration(300)}
            layout={LinearTransition.springify()}
            className="flex-row items-center mx-6 mb-5"
          >
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="bg-white w-10 h-10 rounded-full items-center justify-center mr-3 border border-slate-200"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <ChevronLeft size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[22px] font-semibold tracking-tight text-slate-900">Settings</Text>
          </Animated.View>

          {/* ── Notifications & Alerts ── */}
          <SettingsGroup title="Notifications" delay={100}>
            <SettingsRow
              icon={<Bell size={17} color="#3b82f6" strokeWidth={2} />}
              iconBgColor="#eff6ff"
              label="Push Notifications"
              sublabel="Get reminded near stores"
              isFirst
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleWithHaptic(setNotificationsEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Volume2 size={17} color="#3b82f6" strokeWidth={2} />}
              iconBgColor="#eff6ff"
              label="Sound"
              sublabel="Alert sounds for notifications"
              rightElement={
                <Switch
                  value={soundEnabled}
                  onValueChange={toggleWithHaptic(setSoundEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Vibrate size={17} color="#3b82f6" strokeWidth={2} />}
              iconBgColor="#eff6ff"
              label="Haptic Feedback"
              sublabel="Vibrations on interactions"
              isLast
              rightElement={
                <Switch
                  value={hapticEnabled}
                  onValueChange={toggleWithHaptic(setHapticEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
          </SettingsGroup>

          {/* ── Location & Map ── */}
          <SettingsGroup title="Location" delay={200}>
            <SettingsRow
              icon={<Navigation size={17} color="#22c55e" strokeWidth={2} />}
              iconBgColor="#f0fdf4"
              label="Location Services"
              sublabel="Background geofencing"
              isFirst
              rightElement={
                <Switch
                  value={locationEnabled}
                  onValueChange={toggleWithHaptic(setLocationEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<MapPin size={17} color="#22c55e" strokeWidth={2} />}
              iconBgColor="#f0fdf4"
              label="Geofence Radius"
              sublabel="Distance to trigger alerts"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">100m</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
            <SettingsRow
              icon={<Ruler size={17} color="#22c55e" strokeWidth={2} />}
              iconBgColor="#f0fdf4"
              label="Distance Unit"
              sublabel="Metric or Imperial"
              isLast
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">Metric</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
          </SettingsGroup>

          {/* ── Appearance ── */}
          <SettingsGroup title="Appearance" delay={300}>
            <SettingsRow
              icon={<SunMoon size={17} color="#a855f7" strokeWidth={2} />}
              iconBgColor="#faf5ff"
              label="Theme"
              sublabel="App color scheme"
              isFirst
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">System</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
            <SettingsRow
              icon={<Languages size={17} color="#a855f7" strokeWidth={2} />}
              iconBgColor="#faf5ff"
              label="Language"
              sublabel="App display language"
              isLast
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              rightElement={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[13px] font-medium text-slate-400">English</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              }
            />
          </SettingsGroup>

          {/* ── Smart Features ── */}
          <SettingsGroup title="Smart Features" delay={350}>
            <SettingsRow
              icon={<SlidersHorizontal size={17} color="#f59e0b" strokeWidth={2} />}
              iconBgColor="#fffbeb"
              label="Smart Suggestions"
              sublabel="AI-powered item recommendations"
              isFirst
              rightElement={
                <Switch
                  value={smartSuggestionsEnabled}
                  onValueChange={toggleWithHaptic(setSmartSuggestionsEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<RefreshCw size={17} color="#f59e0b" strokeWidth={2} />}
              iconBgColor="#fffbeb"
              label="Auto-clear Purchased"
              sublabel="Remove bought items after 7 days"
              isLast
              rightElement={
                <Switch
                  value={autoDeletePurchased}
                  onValueChange={toggleWithHaptic(setAutoDeletePurchased)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
          </SettingsGroup>

          {/* ── Security ── */}
          <SettingsGroup title="Privacy & Security" delay={400}>
            <SettingsRow
              icon={<Fingerprint size={17} color="#ef4444" strokeWidth={2} />}
              iconBgColor="#fef2f2"
              label="Face ID / Touch ID"
              sublabel="Require authentication to open"
              isFirst
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleWithHaptic(setBiometricEnabled)}
                  trackColor={switchTrackColor}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon={<Shield size={17} color="#ef4444" strokeWidth={2} />}
              iconBgColor="#fef2f2"
              label="Privacy Policy"
              isLast
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://example.com/privacy');
              }}
            />
          </SettingsGroup>

          {/* ── Data Management ── */}
          <SettingsGroup title="Data Management" delay={450}>
            <SettingsRow
              icon={<Download size={17} color="#64748b" strokeWidth={2} />}
              iconBgColor="#f8fafc"
              label="Export Data"
              sublabel="Download your lists & settings"
              isFirst
              onPress={handleExportData}
            />
            <SettingsRow
              icon={<Trash2 size={17} color="#f59e0b" strokeWidth={2} />}
              iconBgColor="#fffbeb"
              label="Clear Purchased Items"
              sublabel={`${purchasedCount} item${purchasedCount !== 1 ? 's' : ''}`}
              onPress={handleClearPurchased}
            />
            <SettingsRow
              icon={<Trash size={17} color="#ef4444" strokeWidth={2} />}
              iconBgColor="#fef2f2"
              label="Clear All Items"
              sublabel={`${items.length} item${items.length !== 1 ? 's' : ''}`}
              isDanger
              isLast
              onPress={handleClearAll}
            />
          </SettingsGroup>

          {/* ── Support & Feedback ── */}
          <SettingsGroup title="Support" delay={500}>
            <SettingsRow
              icon={<LifeBuoy size={17} color="#0ea5e9" strokeWidth={2} />}
              iconBgColor="#f0f9ff"
              label="Help Center"
              sublabel="FAQ & troubleshooting"
              isFirst
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <SettingsRow
              icon={<MessageSquare size={17} color="#0ea5e9" strokeWidth={2} />}
              iconBgColor="#f0f9ff"
              label="Send Feedback"
              sublabel="Report bugs or suggest features"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('mailto:feedback@smartshopper.app');
              }}
            />
            <SettingsRow
              icon={<Star size={17} color="#0ea5e9" strokeWidth={2} />}
              iconBgColor="#f0f9ff"
              label="Rate SmartShopper"
              sublabel="Leave a review on the App Store"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <SettingsRow
              icon={<Share size={17} color="#0ea5e9" strokeWidth={2} />}
              iconBgColor="#f0f9ff"
              label="Share with Friends"
              isLast
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </SettingsGroup>

          {/* ── About ── */}
          <SettingsGroup title="About" delay={550}>
            <SettingsRow
              icon={<Info size={17} color="#94a3b8" strokeWidth={2} />}
              iconBgColor="#f8fafc"
              label="Version"
              isFirst
              rightElement={
                <Text className="text-[13px] font-medium text-slate-400">1.0.0</Text>
              }
            />
            <SettingsRow
              icon={<FileText size={17} color="#94a3b8" strokeWidth={2} />}
              iconBgColor="#f8fafc"
              label="Terms of Service"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://example.com/terms');
              }}
            />
            <SettingsRow
              icon={<FileText size={17} color="#94a3b8" strokeWidth={2} />}
              iconBgColor="#f8fafc"
              label="Open Source Licenses"
              isLast
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </SettingsGroup>

          {/* ── Danger Zone ── */}
          <SettingsGroup title="Danger Zone" delay={600}>
            <SettingsRow
              icon={<Trash size={17} color="#ef4444" strokeWidth={2} />}
              iconBgColor="#fef2f2"
              label="Reset App"
              sublabel="Delete all data and start fresh"
              isDanger
              isFirst
              isLast
              onPress={handleResetApp}
            />
          </SettingsGroup>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(650)}
            layout={LinearTransition.springify()}
            className="items-center mt-2 mb-4"
          >
            <Text className="text-[12px] font-medium text-slate-300 tracking-wide">Made with ❤️ in Istanbul</Text>
            <Text className="text-[11px] font-medium text-slate-300 mt-1">SmartShopper © 2026</Text>
          </Animated.View>
        </ScrollView>
      </View>
    </AnimatedScreen>
  );
}
