import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { FREE_TIER, getMaxLists } from '@/constants/tierConfig';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Store, ShoppingBag, Crown, Plus, Home, Users, User, Menu, ChevronRight, Radar, Bell, MapPin, X, PlusCircle, MapPinPlus, CheckCircle, Settings, ScanBarcode, Sparkles, Sun, Snowflake, Leaf, Lightbulb } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import ProgressiveBlur from '../../components/ProgressiveBlur';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { fetchMarkets } from '../../services/overpassService';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { useTabBarScrollHandler } from '../../hooks/useTabBarScroll';
import { useLocationStore, useListsStore, useSettingsStore, useQuickStartStore, useNotificationsStore, useShoppingListStore } from '../../store';
import { useScrollToTop } from '@react-navigation/native';
import AnimatedScreen from '../../components/AnimatedScreen';
import RadarPinIcon from '../../components/RadarPinIcon';
import StoreMarker from '../../components/StoreMarker';
import CreateListSheet from '../../components/CreateListSheet';

const getRelativeDate = (timestamp?: number): string => {
  if (!timestamp) return 'today';
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

export default function HomeScreen() {
  const scrollRef = useRef<Animated.ScrollView>(null);
  useScrollToTop(scrollRef as any);
  const scrollHandler = useTabBarScrollHandler();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nearbyStore, setNearbyStore] = useState<string>('Searching location...');
  const [nearestShopName, setNearestShopName] = useState<string | null>(null);
  const [nearestShopDistance, setNearestShopDistance] = useState<string | null>(null);
  const [isNearStore, setIsNearStore] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const unreadCount = useNotificationsStore((state) => state.unreadCount());

  const { templates, incrementUsage } = useQuickStartStore();
  const sortedTemplates = [...templates]
    .sort((a, b) => b.usageCount - a.usageCount)
    .map(t => t.name)
    .slice(0, 4);
  // Shared Zustand store for saved shops (synced with Stores page)
  const { locations: savedShops, removeLocation, cachedMarkets, isFetchingMarkets } = useLocationStore();

  // Haversine formula — returns distance in meters between two lat/lng points
  const haversineDistance = (
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const { distanceUnit, isPro } = useSettingsStore();

  const formatDistance = (meters: number): string => {
    if (distanceUnit === 'imperial') {
      const miles = meters / 1609.34;
      if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
      return `${miles.toFixed(1)} mi`;
    }
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDistanceAway = (meters: number): string => {
    return formatDistance(meters) + ' away';
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const userLat = location.coords.latitude;
        const userLon = location.coords.longitude;
        setUserLocation({ latitude: userLat, longitude: userLon });

        const hasNearbyMarkets = useLocationStore.getState().cachedMarkets.some(
          (m: any) => haversineDistance(userLat, userLon, m.latitude, m.longitude) < 5000
        );

        if (!hasNearbyMarkets && !useLocationStore.getState().isFetchingMarkets) {
          useLocationStore.getState().setIsFetchingMarkets(true, { latitude: userLat, longitude: userLon });
          let offset = 0.015;
          let s = userLat - offset;
          let n = userLat + offset;
          let w = userLon - offset;
          let e = userLon + offset;

          let fetchedMarkets = await fetchMarkets(s, w, n, e);

          if (!fetchedMarkets || fetchedMarkets.length === 0) {
            offset = 0.05;
            s = userLat - offset;
            n = userLat + offset;
            w = userLon - offset;
            e = userLon + offset;
            fetchedMarkets = await fetchMarkets(s, w, n, e);
          }

          if (fetchedMarkets && fetchedMarkets.length > 0) {
            const prev = useLocationStore.getState().cachedMarkets || [];
            const combined = [...prev, ...fetchedMarkets];
            const unique = combined.filter(
              (market, index, self) => index === self.findIndex((m: any) => m.id === market.id)
            );
            useLocationStore.getState().setCachedMarkets(unique);
          }
          useLocationStore.getState().setIsFetchingMarkets(false);
        }
      } catch (error: any) {
        useLocationStore.getState().setIsFetchingMarkets(false);
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
          console.log('Nearby store fetch timed out (expected in slow network/large area).');
        } else {
          console.error('Error fetching nearby store:', error);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!userLocation) {
      setNearbyStore('Searching location...');
      setIsNearStore(false);
      return;
    }

    if (cachedMarkets && cachedMarkets.length > 0) {
      let nearest = cachedMarkets[0];
      let minDist = haversineDistance(userLocation.latitude, userLocation.longitude, nearest.latitude, nearest.longitude);

      for (let i = 1; i < cachedMarkets.length; i++) {
        const dist = haversineDistance(userLocation.latitude, userLocation.longitude, cachedMarkets[i].latitude, cachedMarkets[i].longitude);
        if (dist < minDist) {
          minDist = dist;
          nearest = cachedMarkets[i];
        }
      }

      if (minDist < 10000) {
        setNearbyStore(`${nearest.name} is ${formatDistance(minDist)}`);
        setNearestShopName(nearest.name);
        setNearestShopDistance(formatDistance(minDist));
        setIsNearStore(true);
      } else {
        setNearbyStore(isFetchingMarkets ? 'Searching nearby...' : 'No stores nearby');
        setNearestShopName(null);
        setNearestShopDistance(null);
        setIsNearStore(false);
      }
    } else {
      setNearbyStore(isFetchingMarkets ? 'Searching nearby...' : 'No stores nearby');
      setNearestShopName(null);
      setNearestShopDistance(null);
      setIsNearStore(false);
    }
  }, [cachedMarkets, userLocation, isFetchingMarkets]);

  const { lists: shoppingLists, addList, removeList, canCreateList } = useListsStore();

  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const handlePresentModalPress = useCallback(() => {
    if (!canCreateList(isPro)) {
      Alert.alert(
        'List Limit Reached',
        isPro
          ? `You've reached the maximum of ${getMaxLists(isPro)} shopping lists.`
          : `You've reached the free limit of ${FREE_TIER.maxLists} shopping lists. Upgrade to Pro for unlimited lists.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
            ]
      );
      return;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateSheet(true);
  }, [canCreateList, isPro, router]);

  const handleCreateList = useCallback((name: string) => {
    addList(name);
  }, [addList]);

  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  const closeAllSwipeables = (exceptId?: number) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  };



  const renderRightActions = (listId: number) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
          removeList(listId);
          swipeableRefs.current.delete(listId);
        }}
      >
        <View style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', paddingRight: 16 }}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };



  const swipeableShopRefs = useRef<Map<string, Swipeable>>(new Map());

  const closeAllShopSwipeables = (exceptId?: string) => {
    swipeableShopRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  };

  const renderShopRightActions = (shopId: string) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
          removeLocation(shopId);
          swipeableShopRefs.current.delete(shopId);
        }}
      >
        <View style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', paddingRight: 16 }}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Dynamic Recommendations Logic
  const currentHour = new Date().getHours();
  let timeContextList = "Evening Groceries";
  if (currentHour >= 5 && currentHour < 12) timeContextList = "Morning Coffee Run";
  else if (currentHour >= 12 && currentHour < 17) timeContextList = "Afternoon Snack";
  else if (currentHour >= 17 && currentHour < 21) timeContextList = "Dinner Prep";

  const suggestedShop = savedShops.length > 0 ? savedShops[0] : null;

  // Seasonal Logic
  const currentMonth = new Date().getMonth();
  let seasonalTitle = "Winter Warmers";
  let seasonalItems = ["Hot Chocolate", "Tea", "Marshmallows", "Soup"];
  let SeasonalIcon = Snowflake;
  if (currentMonth >= 2 && currentMonth <= 4) { // Spring
    seasonalTitle = "Spring Cleaning";
    seasonalItems = ["Trash Bags", "Sponges", "Window Cleaner", "Paper Towels"];
    SeasonalIcon = Sparkles;
  } else if (currentMonth >= 5 && currentMonth <= 7) { // Summer
    seasonalTitle = "Summer BBQ";
    seasonalItems = ["Burgers", "Hot Dogs", "Charcoal", "Soda"];
    SeasonalIcon = Sun;
  } else if (currentMonth >= 8 && currentMonth <= 10) { // Autumn
    seasonalTitle = "Autumn Comforts";
    seasonalItems = ["Pumpkins", "Cinnamon", "Apples", "Baking Flour"];
    SeasonalIcon = Leaf;
  }

  const handleCreateSuggestedList = (name: string) => {
    if (!canCreateList(isPro)) {
      Alert.alert(
        'List Limit Reached',
        isPro
          ? `You've reached the maximum of ${getMaxLists(isPro)} shopping lists.`
          : `You've reached the free limit of ${FREE_TIER.maxLists} shopping lists. Upgrade to Pro for unlimited lists.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
            ]
      );
      return;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    const listId = addList(name);

    if (name === "Most Purchased") {
      const allItems = useShoppingListStore.getState().items;
      const frequency: Record<string, { count: number, item: any }> = {};
      
      allItems.forEach((item: any) => {
        if (item.isPurchased) {
          const nameKey = item.name.trim().toLowerCase();
          if (!frequency[nameKey]) {
            frequency[nameKey] = { count: 0, item };
          }
          frequency[nameKey].count += 1;
        }
      });
      
      const sortedNames = Object.keys(frequency).sort((a, b) => frequency[b].count - frequency[a].count);
      const topItems = sortedNames.slice(0, 10).map(key => frequency[key].item);
      
      topItems.forEach((item: any) => {
        useShoppingListStore.getState().addItem(listId, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category
        });
      });
    } else if (name === seasonalTitle) {
      seasonalItems.forEach(itemName => {
        useShoppingListStore.getState().addItem(listId, {
          name: itemName,
          quantity: 1,
          unit: "unit",
          category: "Other"
        });
      });
    } else if (name === "Did you forget?") {
      const allItems = useShoppingListStore.getState().items;
      const unpurchased = allItems.filter((i: any) => !i.isPurchased);
      unpurchased.sort((a: any, b: any) => a.createdAt - b.createdAt);
      
      const uniqueNames = new Set<string>();
      const topForgot = [];
      for (const item of unpurchased) {
        const lowerName = item.name.trim().toLowerCase();
        if (!uniqueNames.has(lowerName)) {
          uniqueNames.add(lowerName);
          topForgot.push(item);
        }
        if (topForgot.length >= 8) break;
      }
      
      topForgot.forEach((item: any) => {
        useShoppingListStore.getState().addItem(listId, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category
        });
      });
    }

    incrementUsage(name);
  };

  return (
    // 1. ROOT MUST BE A STANDARD VIEW, NOT SafeAreaView!
    <AnimatedScreen>
    <View className="flex-1 bg-[#F2F2F7]"> 
      <StatusBar style="dark" />

      {/* 2. THE SCROLLING CONTENT */}
      <Animated.ScrollView 
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          closeAllSwipeables();
          closeAllShopSwipeables();
        }}
      >
        {/* SCROLLING HEADER CONTENT */}
        <View 
          className="px-6 flex-row justify-between items-center"
          style={{ paddingTop: insets.top + 8, paddingBottom: 4 }}
        >
          <View className="flex-row items-center gap-0">
            <Image source={require('../../assets/images/app-logo.png')} style={{ width: 110, height: 110, marginLeft: -27, marginRight: -32, marginTop: -37, marginBottom: -37 }} resizeMode="contain" />
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">GeoCart</Text>
          </View>
          
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }}
            className="w-[42px] h-[42px] bg-white rounded-full items-center justify-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Bell size={20} color="#0f172a" />
            {unreadCount > 0 && (
              <View className="absolute top-[10px] right-[12px] w-[9px] h-[9px] bg-red-500 rounded-full border-[1.5px] border-white" />
            )}
          </TouchableOpacity>
        </View>

        {/* 2. THE MAP WIDGET */}
          {/* Smart Status Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-2 mb-3 rounded-[36px] bg-white border border-slate-100 overflow-hidden"
            
          >
            {/* Map Widget Always Visible */}
            <View className="flex-col">
              {/* Upper Tier: Dynamic Map Preview */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}>
                <View className="w-full h-60 rounded-t-[36px] overflow-hidden" pointerEvents="none">
                  {userLocation ? (
                    <MapView
                      style={{ width: '100%', height: '100%' }}
                      userInterfaceStyle="light"
                      showsUserLocation={true}
                      initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.025,
                        longitudeDelta: 0.025}}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      {savedShops.map((shop) => (
                        <Marker
                          key={shop.id}
                          coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                        >
                          <StoreMarker isSaved={true} isSelected={false} />
                        </Marker>
                      ))}
                    </MapView>
                  ) : (
                    <View className="w-full h-full bg-slate-100 items-center justify-center">
                      <Text className="text-slate-400 font-medium text-[15px]">Loading map...</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View className="h-[1px] w-full bg-slate-50" />

              {/* Lower Tier: Info & Action */}
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}
                className="flex-row justify-between items-center py-3 px-5"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-10 items-center justify-center">
                    <RadarPinIcon
                      size={22}
                      pinColor="#334155"
                      pulseColor={isNearStore ? '#22c55e' : '#94a3b8'}
                      active={isNearStore}
                    />
                  </View>
                  {nearestShopName ? (
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8', letterSpacing: 0.2 }}>Nearest Shop</Text>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3, marginTop: 1 }} numberOfLines={1}>
                        {nearestShopName}
                        <Text style={{ color: '#cbd5e1', fontWeight: '400' }}> · </Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b' }}>{nearestShopDistance}</Text>
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[15px] font-semibold text-slate-900 tracking-tight">{nearbyStore}</Text>
                  )}
                </View>

              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 3. My Lists Section */}
          <Animated.View layout={LinearTransition.springify()} className="flex-row items-center justify-between mx-6 mb-3 mt-1">
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: '#0f172a' }}>Lists</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {shoppingLists.length > 3 && (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/lists'); }}
                >
                  <Text className="text-[12px] font-semibold text-slate-400">See All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePresentModalPress}
                style={{
                  backgroundColor: '#0f172a',
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center'}}
              >
                <Plus size={13} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </Animated.View>
          {shoppingLists.length === 0 ? (
            <Animated.View layout={LinearTransition.springify()} className="mb-3 mt-1">
              {/* Inline Empty State */}
              <View className="px-6 mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-slate-100/60 rounded-[10px] items-center justify-center">
                    <ShoppingBag size={18} color="#64748b" />
                  </View>
                  <View>
                    <Text className="text-[16px] font-semibold text-slate-900 tracking-tight">No lists yet</Text>
                    <Text className="text-[13px] font-medium text-slate-500 mt-0.5">Create your first list</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePresentModalPress}
                  className="bg-slate-100 rounded-full px-3.5 py-2 flex-row items-center gap-1.5"
                >
                  <Plus size={14} color="#0f172a" strokeWidth={2.5} />
                  <Text className="text-[#0f172a] text-[13px] font-bold">New List</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Start Suggestions */}
              <View className="flex-row items-center mb-3 px-6">
                <Text className="text-[15px] font-medium text-slate-500 tracking-tight">Suggestions</Text>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 24, gap: 10, paddingBottom: 10 }}
              >
                {sortedTemplates.map((template) => (
                  <TouchableOpacity
                    key={template}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!canCreateList(isPro)) {
                        Alert.alert(
                          'List Limit Reached',
                          isPro
                            ? `You've reached the maximum of ${getMaxLists(isPro)} shopping lists.`
                            : `You've reached the free limit of ${FREE_TIER.maxLists} shopping lists. Upgrade to Pro for unlimited lists.`,
                          isPro
                            ? [{ text: 'OK' }]
                            : [
                                { text: 'OK', style: 'cancel' },
                                { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
                              ]
                        );
                        return;
                      }
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      addList(template);
                      incrementUsage(template);
                    }}
                    className="bg-white border border-slate-100 rounded-[16px] px-4 py-3 flex-row items-center gap-2"
                    
                  >
                    <Plus size={16} color="#0f172a" strokeWidth={2.5} />
                    <Text className="text-[14px] font-semibold text-slate-700">{template}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          ) : (
            <>
              {shoppingLists.slice(0, 3).map((list) => (
                <Animated.View
                  key={list.id}
                  layout={LinearTransition.springify()}
                  exiting={FadeOutLeft.duration(200)}
                >
                  <Swipeable
                    containerStyle={{ marginHorizontal: 24, marginBottom: 10 }}
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current.set(list.id, ref);
                      } else {
                        swipeableRefs.current.delete(list.id);
                      }
                    }}
                    renderRightActions={() => renderRightActions(list.id)}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                    onSwipeableWillOpen={() => closeAllSwipeables(list.id)}
                  >
                    <TouchableOpacity 
                      onPress={() => { closeAllSwipeables(); closeAllShopSwipeables(); hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.push(`/list/${list.id}`); }}
                      className="bg-white rounded-[22px] flex-row items-center justify-between"
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14}}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Menu size={16} color="#475569" />
                        </View>
                        <View className="flex-1">
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{list.name}</Text>
                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>{list.count}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>Updated {getRelativeDate(list.createdAt)}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </Swipeable>
                </Animated.View>
              ))}

            </>
          )}

          {/* 4. My Shops Section */}
          <Animated.View layout={LinearTransition.springify()} className="flex-row items-center justify-between mx-6 mt-4 mb-3">
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: '#0f172a' }}>Shops</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {savedShops.length > 3 && (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}
                >
                  <Text className="text-[12px] font-semibold text-slate-400">See All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Medium); router.push('/stores'); }}
                style={{
                  backgroundColor: '#0f172a',
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center'}}
              >
                <Plus size={13} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </Animated.View>
          {savedShops.length === 0 && (
            <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-4">
              <View
                className="rounded-[28px] p-6 items-center border border-dashed border-slate-200"
                style={{ backgroundColor: '#f8fafc' }}
              >
                <View className="bg-white border border-slate-100 w-14 h-14 rounded-full items-center justify-center mb-4" >
                  <Store size={24} color="#94a3b8" />
                </View>
                <Text className="text-[16px] font-semibold text-slate-600 tracking-tight">No saved shops yet</Text>
                <Text className="text-[14px] font-medium text-slate-400 mt-1.5 text-center px-4">Tap Add to save favorite locations from the map</Text>
              </View>
            </Animated.View>
          )}
          {savedShops.slice(0, 3).map((shop) => (
            <Animated.View
              key={shop.id}
              layout={LinearTransition.springify()}
              exiting={FadeOutLeft.duration(200)}
            >
              <Swipeable
                containerStyle={{ marginHorizontal: 24, marginBottom: 10 }}
                ref={(ref) => {
                  if (ref) {
                    swipeableShopRefs.current.set(shop.id, ref);
                  } else {
                    swipeableShopRefs.current.delete(shop.id);
                  }
                }}
                renderRightActions={() => renderShopRightActions(shop.id)}
                rightThreshold={40}
                overshootRight={false}
                friction={2}
                onSwipeableWillOpen={() => closeAllShopSwipeables(shop.id)}
              >
                <TouchableOpacity 
                  onPress={() => { closeAllSwipeables(); closeAllShopSwipeables(); hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/stores', params: { shopId: shop.id } }); }}
                  className="bg-white rounded-[22px] flex-row items-center justify-between"
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <Store size={16} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{shop.name}</Text>
                        {userLocation && (
                          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>{formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude))}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>{shop.address || 'Saved Shop'}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
          ))}



          {/* 5. Suggestions Section */}
          <Animated.View layout={LinearTransition.springify()} className="mt-6 mb-2">
            <View className="px-6 mb-4">
              <Text className="text-[22px] font-extrabold tracking-tight text-slate-900">Suggestions</Text>
              <Text className="text-[14px] font-medium text-slate-500 mt-1">Based on your shopping habits</Text>
            </View>
            <View className="px-6 gap-3 pb-4">
              {/* 1. Shop Card (Most Visited or Nearest) */}
              {(suggestedShop || nearestShopName) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { 
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light); 
                    if (suggestedShop) {
                      router.push({ pathname: '/stores', params: { shopId: suggestedShop.id } }); 
                    } else {
                      router.push('/stores');
                    }
                  }}
                  className="bg-violet-50 border border-violet-100 rounded-[20px] px-4 py-4 flex-row items-center gap-3 w-full"
                >
                  <View className="w-9 h-9 rounded-full bg-violet-100 items-center justify-center">
                    <Store size={18} color="#8b5cf6" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] font-semibold text-violet-500">{suggestedShop ? "Frequently visited" : "Nearest to you"}</Text>
                    <Text className="text-[15px] font-bold text-violet-900 leading-tight mt-0.5">{suggestedShop ? suggestedShop.name : nearestShopName}</Text>
                  </View>
                  <ChevronRight size={18} color="#c4b5fd" />
                </TouchableOpacity>
              )}

              {/* Grid Row for Time-based and Restock */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCreateSuggestedList(timeContextList)}
                  className="flex-1 bg-blue-50 border border-blue-100 rounded-[20px] p-4 flex-col gap-3"
                >
                  <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
                    <Flame size={18} color="#3b82f6" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text className="text-[12px] font-semibold text-blue-500">Quick Start</Text>
                    <Text className="text-[15px] font-bold text-blue-900 leading-tight mt-0.5">{timeContextList}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCreateSuggestedList("Most Purchased")}
                  className="flex-1 bg-emerald-50 border border-emerald-100 rounded-[20px] p-4 flex-col gap-3"
                >
                  <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center">
                    <ShoppingBag size={18} color="#10b981" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text className="text-[12px] font-semibold text-emerald-600">Weekly</Text>
                    <Text className="text-[15px] font-bold text-emerald-900 leading-tight mt-0.5">Most Purchased</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Grid Row 2 for Did You Forget and Seasonal */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCreateSuggestedList("Did you forget?")}
                  className="flex-1 bg-amber-50 border border-amber-100 rounded-[20px] p-4 flex-col gap-3"
                >
                  <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center">
                    <Lightbulb size={18} color="#d97706" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text className="text-[12px] font-semibold text-amber-600">Pending Items</Text>
                    <Text className="text-[15px] font-bold text-amber-900 leading-tight mt-0.5">Did you forget?</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCreateSuggestedList(seasonalTitle)}
                  className="flex-1 bg-rose-50 border border-rose-100 rounded-[20px] p-4 flex-col gap-3"
                >
                  <View className="w-9 h-9 rounded-full bg-rose-100 items-center justify-center">
                    <SeasonalIcon size={18} color="#e11d48" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text className="text-[12px] font-semibold text-rose-500">Seasonal</Text>
                    <Text className="text-[15px] font-bold text-rose-900 leading-tight mt-0.5">{seasonalTitle}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
            </View>
          </Animated.View>

        </Animated.ScrollView>

        {/* Bottom Sheet for Adding New List */}
        <CreateListSheet
          visible={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          onCreateList={handleCreateList}
        />
    </View>
    </AnimatedScreen>
  );
}
