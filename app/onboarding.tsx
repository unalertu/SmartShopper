import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, MapPin, Bell, Shield, Check, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';
import { setupNotifications } from '@/services/notificationService';
import { Colors } from '@/constants/theme';

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
          borderRadius: 24, // Apple-style rounded button
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: NAVY_COLOR,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <Text style={{ color: 'white', fontSize: 17, fontWeight: '600' }}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PageIndicator({ scrollX, pageCount }: { scrollX: Animated.SharedValue<number>, pageCount: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {Array.from({ length: pageCount }).map((_, i) => {
        const animatedStyle = useAnimatedStyle(() => {
          const widthVal = interpolate(
            scrollX.value,
            [(i - 1) * width, i * width, (i + 1) * width],
            [8, 24, 8],
            Extrapolation.CLAMP
          );
          const opacityVal = interpolate(
            scrollX.value,
            [(i - 1) * width, i * width, (i + 1) * width],
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
          );
          const colorVal = interpolate(
            scrollX.value,
            [(i - 1) * width, i * width, (i + 1) * width],
            [0, 1, 0],
            Extrapolation.CLAMP
          );
          return {
            width: widthVal,
            opacity: opacityVal,
            backgroundColor: colorVal === 1 ? NAVY_COLOR : '#cbd5e1',
          };
        });
        return (
          <Animated.View
            key={i}
            style={[{ height: 8, borderRadius: 4 }, animatedStyle]}
          />
        );
      })}
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
  { id: 'location', type: 'location' },
  { id: 'notification', type: 'notification' },
  { id: 'personalize', type: 'personalize' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Settings state for screen 5
  const { savedStoresOnly, setSavedStoresOnly, setHasCompletedOnboarding } = useSettingsStore();

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

  const finishOnboarding = () => {
    setHasCompletedOnboarding(true);
    setupNotifications();
    router.replace('/(tabs)');
  };

  const handlePrimaryAction = async () => {
    const current = PAGES[currentIndex];
    
    if (current.type === 'location') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          await Location.requestBackgroundPermissionsAsync();
        }
      } catch (e) {
        console.warn(e);
      }
      goToNext();
    } else if (current.type === 'notification') {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.warn(e);
      }
      goToNext();
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
              <View style={{ width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 140, height: 140, backgroundColor: '#e2e8f0', borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={100} color={NAVY_COLOR} style={{ position: 'absolute', top: 10 }} />
                  <ShoppingCart size={40} color="white" style={{ position: 'absolute', top: 35 }} />
                </View>
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Welcome to GeoCart</Text>
              <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 16, lineHeight: 24 }}>The smart way to never forget your shopping list again.</Text>
            </View>
          </View>
        )}

        {page.type === 'how-it-works' && (
          <View style={{ flex: 1, paddingTop: 40 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>How It Works</Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 40 }}>GeoCart helps you shop smarter with automatic reminders.</Text>
            
            <View style={{ gap: 32 }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>1</Text>
                  </View>
                  <View style={{ position: 'absolute', top: 24, bottom: -32, width: 2, backgroundColor: '#e2e8f0', zIndex: 1 }} />
                </View>
                <View style={{ flex: 1, paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <View style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 16 }}>
                      <ShoppingCart size={20} color={NAVY_COLOR} />
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: NAVY_COLOR }}>Create your shopping list</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>Add items you need from the store.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>2</Text>
                  </View>
                  <View style={{ position: 'absolute', top: 24, bottom: -32, width: 2, backgroundColor: '#e2e8f0', zIndex: 1 }} />
                </View>
                <View style={{ flex: 1, paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <View style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 16 }}>
                      <MapPin size={20} color={NAVY_COLOR} />
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: NAVY_COLOR }}>Get near a store</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>We detect when you're close to a store.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>3</Text>
                  </View>
                </View>
                <View style={{ flex: 1, paddingBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <View style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 16 }}>
                      <Bell size={20} color={NAVY_COLOR} />
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: NAVY_COLOR }}>Get a reminder</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>We remind you so you never forget anything.</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {page.type === 'location' && (
          <View style={{ flex: 1 }}>
            <IllustrationBox>
              <View style={{ width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
                 <MapPin size={80} color={NAVY_COLOR} />
                 <View style={{ position: 'absolute', width: 200, height: 2, backgroundColor: '#cbd5e1', bottom: 40, borderStyle: 'dashed' }} />
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Always Allow Location</Text>
              <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 16, lineHeight: 22 }}>GeoCart only uses your location to detect nearby stores and send you helpful reminders.</Text>
            </View>
            <View style={{ marginTop: 'auto', backgroundColor: '#f8fafc', padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Shield size={24} color={NAVY_COLOR} />
              <Text style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 }}>Your location is never sold or shared. We respect your privacy.</Text>
            </View>
          </View>
        )}

        {page.type === 'notification' && (
          <View style={{ flex: 1 }}>
            <IllustrationBox>
              <View style={{ width: 180, height: 180, backgroundColor: '#f1f5f9', borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
                 <Bell size={80} color={NAVY_COLOR} />
                 <View style={{ position: 'absolute', right: 30, bottom: 50, width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center' }}>
                   <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>1</Text>
                 </View>
              </View>
            </IllustrationBox>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Enable Notifications</Text>
              <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 16, lineHeight: 22 }}>We'll only notify you when a shopping reminder is actually useful.</Text>
            </View>
            <View style={{ marginTop: 'auto', backgroundColor: '#f8fafc', padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Bell size={24} color={NAVY_COLOR} />
              <Text style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 }}>Don't worry, we hate spam too. You're in control.</Text>
            </View>
          </View>
        )}

        {page.type === 'personalize' && (
          <View style={{ flex: 1, paddingTop: 40 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: NAVY_COLOR, textAlign: 'center', letterSpacing: -0.5 }}>Personalize Your Experience</Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 32 }}>Set your preferences to get the best reminders.</Text>
            
            <View style={{ gap: 24 }}>


              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: NAVY_COLOR, marginBottom: 4 }}>Saved Stores Only</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 18 }}>Reduce battery usage by only monitoring your saved stores.</Text>
                </View>
                <Switch 
                  value={savedStoresOnly} 
                  onValueChange={setSavedStoresOnly} 
                  trackColor={{ true: NAVY_COLOR, false: '#e2e8f0' }} 
                />
              </View>
            </View>

            <View style={{ marginTop: 'auto', backgroundColor: '#f8fafc', padding: 20, borderRadius: 28, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY_COLOR, alignItems: 'center', justifyContent: 'center' }}>
                  <Crown size={20} color="white" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: NAVY_COLOR }}>Upgrade Anytime</Text>
              </View>
              <View style={{ gap: 8 }}>
                {['Unlimited Saved Stores', 'Adjustable Reminder Distance', 'Unlimited Lists', 'Advanced Reminder Settings'].map((feat, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Check size={16} color={NAVY_COLOR} />
                    <Text style={{ fontSize: 14, color: '#475569' }}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

      </View>
    );
  };

  const currentConfig = PAGES[currentIndex];
  let primaryLabel = 'Next';
  if (currentConfig.type === 'welcome') primaryLabel = 'Get Started';
  if (currentConfig.type === 'location') primaryLabel = 'Enable Location';
  if (currentConfig.type === 'notification') primaryLabel = 'Enable Notifications';
  if (currentConfig.type === 'personalize') primaryLabel = 'Finish Setup';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
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
          {currentConfig.type !== 'personalize' ? (
            <TouchableOpacity onPress={handleSkip} style={{ marginTop: 16, padding: 8 }}>
              <Text style={{ color: NAVY_COLOR, fontSize: 15, fontWeight: '600' }}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 40 }} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
