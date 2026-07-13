import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Switch, Image, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, MapPin, Bell, Shield, Check, Crown, Settings, SlidersHorizontal, Ruler, Battery, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation, useAnimatedScrollHandler, SharedValue, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';
import { setupNotifications } from '@/services/notificationService';
import { Colors } from '@/constants/theme';
import NotificationPermissionSheet from '@/components/NotificationPermissionSheet';

const { width, height } = Dimensions.get('window');
const NAVY_COLOR = Colors.surface[900];

// --- Shared Components ---

function PrimaryButton({ title, onPress }: { title: string, onPress: () => void }) {
  const scale = useSharedValue(1);
  const handlePressIn = () => { scale.value = withSpring(0.96); };
  const handlePressOut = () => { scale.value = withSpring(1); };
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animatedStyle, { width: '100%', paddingHorizontal: 24 }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={{
          backgroundColor: NAVY_COLOR,
          paddingVertical: 18,
          borderRadius: 30,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: NAVY_COLOR,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View style={{ height: 24, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Animated.Text
            key={title}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(100)}
            style={{ position: 'absolute', color: 'white', fontSize: 17, fontWeight: '600' }}
          >
            {title}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PageIndicatorDot({ scrollX, index }: { scrollX: SharedValue<number>, index: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    const widthVal = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [8, 24, 8],
      Extrapolation.CLAMP
    );
    const opacityVal = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );
    const colorVal = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      width: widthVal,
      opacity: opacityVal,
      backgroundColor: colorVal === 1 ? NAVY_COLOR : '#cbd5e1',
    };
  });

  return <Animated.View style={[{ height: 8, borderRadius: 4 }, animatedStyle]} />;
}

function PageIndicator({ scrollX, pageCount }: { scrollX: SharedValue<number>, pageCount: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {Array.from({ length: pageCount }).map((_, index) => (
        <PageIndicatorDot key={index} scrollX={scrollX} index={index} />
      ))}
    </View>
  );
}

function IllustrationBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: height * 0.3, marginTop: 40 }}>
      {children}
    </View>
  );
}

// --- Data Driven Configuration ---

const PAGES = [
  { id: 'welcome', type: 'welcome' },
  { id: 'how-it-works', type: 'how-it-works' },
  { id: 'notification', type: 'notification' },
  { id: 'location', type: 'location' },
  { id: 'personalize', type: 'personalize' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);

  // Settings state for screen 5
  const { savedStoresOnly, setSavedStoresOnly, setHasCompletedOnboarding, distanceUnit, setDistanceUnit } = useSettingsStore();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    if (currentIndex < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      scrollRef.current?.scrollTo({ x: (currentIndex - 1) * width, animated: true });
    }
  };

  const finishOnboarding = () => {
    setHasCompletedOnboarding(true);
    setupNotifications();
    router.replace('/(tabs)');
  };

  const handlePrimaryAction = async () => {
    const current = PAGES[currentIndex];
    
    if (current.type === 'location') {
      if (locationGranted) {
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status !== 'granted') {
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch (e) {}
        }
        goToNext();
        return;
      }
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationGranted(true);
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch (err) {
            console.warn("Background location permission error:", err);
          }
          return; // Sayfa otomatik geçmeyecek, butona tekrar basılması beklenecek
        } else {
          if (!canAskAgain) {
            Alert.alert(
              'Location Access Required',
              'GeoCart needs location access to notify you when you\'re near stores. Please enable "Always" in Settings.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => goToNext() },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
                    else Linking.openSettings();
                  }
                }
              ]
            );
            return;
          }
        }
      } catch (e) {
        console.warn(e);
      }
      goToNext();
    } else if (current.type === 'notification') {
      if (notificationGranted) {
        goToNext();
        return;
      }
      setShowNotificationSheet(true);
      return;
    } else if (current.type === 'personalize') {
      finishOnboarding();
    } else {
      goToNext();
    }
  };

  const handleSkip = () => {
    goToNext();
  };

  const renderPage = (page: typeof PAGES[number], index: number) => {
    return (
      <View key={page.id} style={{ width, flex: 1, paddingHorizontal: 32, paddingBottom: 160 }}>
        
        {page.type === 'welcome' && (
          <View style={{ flex: 1 }}>
            <IllustrationBox>
              <View style={{ width: 180, height: 180, borderRadius: 48, borderCurve: 'continuous', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 140, height: 140, borderRadius: 36, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: NAVY_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                  <Image
                    source={require('../assets/images/app-icon.png')}
                    resizeMode="contain"
                    style={{ width: 120, height: 120 }}
                  />
                </View>
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Welcome to GeoCart</Text>
              <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 20, lineHeight: 24 }}>Your shopping list, right when{`\n`}and where you need it.</Text>
            </View>
          </View>
        )}

        {page.type === 'how-it-works' && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>How It Works</Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 22 }}>Three simple steps, then GeoCart does the remembering for you.</Text>

            <View style={{ gap: 12 }}>
              {[
                { step: '01', title: 'Create your list', description: 'Add everything you need.', icon: <ShoppingCart size={24} color={NAVY_COLOR} /> },
                { step: '02', title: 'Walk near a store', description: 'GeoCart notices when you are close.', icon: <MapPin size={24} color={NAVY_COLOR} /> },
                { step: '03', title: 'Get a reminder', description: 'Your list appears at the right moment.', icon: <Bell size={24} color={NAVY_COLOR} /> },
              ].map((item) => (
                <View key={item.step} style={{ minHeight: 78, padding: 14, borderRadius: 28, borderCurve: 'continuous', backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 50, height: 50, borderRadius: 20, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: NAVY_COLOR, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 }}>
                    {item.icon}
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: NAVY_COLOR }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 18 }}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {page.type === 'location' && (
          <View style={{ flex: 1 }}>
            <IllustrationBox>
              <View style={{ width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 48, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 136, height: 136, borderRadius: 68, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: NAVY_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 }}>
                    <MapPin size={38} color={NAVY_COLOR} style={{ marginLeft: -4, marginTop: -4 }} />
                    <View style={{ position: 'absolute', bottom: -4, right: -4, width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white' }}>
                      <ShoppingCart size={18} color="white" />
                    </View>
                    <View style={{ position: 'absolute', top: -2, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: NAVY_COLOR, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 }}>
                      <Bell size={12} color={NAVY_COLOR} />
                    </View>
                  </View>
                </View>
                <View style={{ position: 'absolute', top: 34, right: 34, width: 12, height: 12, borderRadius: 6, backgroundColor: NAVY_COLOR, borderWidth: 3, borderColor: '#f1f5f9' }} />
                <View style={{ position: 'absolute', bottom: 36, left: 38, width: 9, height: 9, borderRadius: 5, backgroundColor: '#94a3b8' }} />
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Get Reminded at the{'\n'}Right Place</Text>
              <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 12, lineHeight: 22 }}>GeoCart reminds you about your shopping list{'\n'}when you're near a store.</Text>
            </View>
            <View style={{ marginTop: 'auto', gap: 10, marginBottom: 16 }}>
              <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={18} color="#3b82f6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e3a8a' }}>"Always Allow" Required</Text>
                  <Text style={{ fontSize: 11, color: '#3b82f6', lineHeight: 16, marginTop: 2 }}>Please select "Always Allow" in the upcoming prompts to get reminders.</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color={NAVY_COLOR} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY_COLOR }}>Your Location Stays Private</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, marginTop: 2 }}>Used only for nearby store reminders.</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {page.type === 'notification' && (
          <View style={{ flex: 1 }}>
            <IllustrationBox>
              <View style={{ width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 48, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: '#e2e8f0' }} />
                <View style={{ width: 92, height: 92, borderRadius: 34, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: NAVY_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 }}>
                  <Bell size={48} color={NAVY_COLOR} />
                </View>
                <View style={{ position: 'absolute', right: 34, top: 35, width: 30, height: 30, borderRadius: 15, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#f1f5f9' }}>
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '800' }}>1</Text>
                </View>
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Enable Smart Alerts</Text>
              <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 12, lineHeight: 22 }}>GeoCart reminds you at the right place and time.</Text>
            </View>
            <View style={{ marginTop: 'auto', backgroundColor: '#f8fafc', padding: 12, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                <SlidersHorizontal size={18} color={NAVY_COLOR} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY_COLOR }}>Only useful reminders</Text>
                <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, marginTop: 2 }}>No spam. You stay in control.</Text>
              </View>
            </View>
          </View>
        )}

        {page.type === 'personalize' && (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, paddingTop: height * 0.07 }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Personalize GeoCart</Text>
              <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 }}>Choose how GeoCart works best for you.</Text>

            <Animated.View layout={LinearTransition.springify()} style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 30, borderCurve: 'continuous' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 19, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={24} color={NAVY_COLOR} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY_COLOR }}>Saved Shops Only</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 17, marginTop: 3 }}>Alerts only for saved shops.{'\n'}Stops nearby shop discovery.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 20, padding: 4 }}>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSavedStoresOnly(false);
                  }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: !savedStoresOnly ? 'white' : 'transparent', borderRadius: 16, shadowColor: !savedStoresOnly ? NAVY_COLOR : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: !savedStoresOnly ? 2 : 0 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: !savedStoresOnly ? '700' : '500', color: !savedStoresOnly ? NAVY_COLOR : '#64748b' }}>Off</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSavedStoresOnly(true);
                  }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: savedStoresOnly ? 'white' : 'transparent', borderRadius: 16, shadowColor: savedStoresOnly ? NAVY_COLOR : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: savedStoresOnly ? 2 : 0 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: savedStoresOnly ? '700' : '500', color: savedStoresOnly ? NAVY_COLOR : '#64748b' }}>On</Text>
                </TouchableOpacity>
              </View>

              {savedStoresOnly && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}
                >
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 6, borderRadius: 12 }}>
                    <Battery size={14} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginLeft: 8 }}>
                    Reduces battery usage
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View layout={LinearTransition.springify()} style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 30, borderCurve: 'continuous', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 19, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                  <Ruler size={24} color={NAVY_COLOR} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY_COLOR }}>Distance Unit</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 17, marginTop: 3 }}>How do you measure distance?</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 20, padding: 4 }}>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDistanceUnit('imperial');
                  }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: distanceUnit === 'imperial' ? 'white' : 'transparent', borderRadius: 16, shadowColor: distanceUnit === 'imperial' ? NAVY_COLOR : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: distanceUnit === 'imperial' ? 2 : 0 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: distanceUnit === 'imperial' ? '700' : '500', color: distanceUnit === 'imperial' ? NAVY_COLOR : '#64748b' }}>Imperial (mi, ft)</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDistanceUnit('metric');
                  }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: distanceUnit === 'metric' ? 'white' : 'transparent', borderRadius: 16, shadowColor: distanceUnit === 'metric' ? NAVY_COLOR : 'transparent', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: distanceUnit === 'metric' ? 2 : 0 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: distanceUnit === 'metric' ? '700' : '500', color: distanceUnit === 'metric' ? NAVY_COLOR : '#64748b' }}>Metric (km, m)</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            </View>

            <Animated.View layout={LinearTransition.springify()} style={{ marginTop: 'auto', backgroundColor: '#f8fafc', padding: 12, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} color={NAVY_COLOR} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY_COLOR }}>Always in Control</Text>
                <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, marginTop: 2 }}>You can change these anytime in Settings.</Text>
              </View>
            </Animated.View>
          </View>
        )}

      </View>
    );
  };

  const currentConfig = PAGES[currentIndex];
  let primaryLabel = 'Next';
  if (currentConfig.type === 'welcome') primaryLabel = 'Get Started';
  if (currentConfig.type === 'location') primaryLabel = locationGranted ? 'Continue' : 'Enable Location';
  if (currentConfig.type === 'notification') primaryLabel = notificationGranted ? 'Continue' : 'Enable Notifications';
  if (currentConfig.type === 'personalize') primaryLabel = 'Finish Setup';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => renderPage(p, i))}
      </Animated.ScrollView>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 32, backgroundColor: 'white', paddingTop: 20 }}>
        <PageIndicator scrollX={scrollX} pageCount={PAGES.length} />
        <View style={{ alignItems: 'center' }}>
          <PrimaryButton title={primaryLabel} onPress={handlePrimaryAction} />
          <View style={{ minHeight: 50, justifyContent: 'center', marginTop: 12 }}>
            {currentIndex > 0 && (
              <TouchableOpacity onPress={goToPrevious} style={{ 
                backgroundColor: '#f1f5f9', 
                paddingHorizontal: 32, 
                paddingVertical: 12, 
                borderRadius: 24, 
                borderCurve: 'continuous'
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748b' }}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      <NotificationPermissionSheet
        visible={showNotificationSheet}
        onDismiss={() => setShowNotificationSheet(false)}
        onGranted={() => setNotificationGranted(true)}
      />
    </SafeAreaView>
  );
};
