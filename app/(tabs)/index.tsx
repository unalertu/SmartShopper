import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Store, ShoppingBag, Crown, Plus, Home, Users, User, Menu, ChevronRight, Radar, Bell, MapPin, X, PlusCircle, MapPinPlus, CheckCircle, Settings, ScanBarcode, Sparkles } from 'lucide-react-native';
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
import { useLocationStore, useListsStore, useSettingsStore, useQuickStartStore, useNotificationsStore } from '../../store';
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
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
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

  const { distanceUnit } = useSettingsStore();

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

  const { lists: shoppingLists, addList, removeList } = useListsStore();

  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const handlePresentModalPress = useCallback(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateSheet(true);
  }, []);

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

  return (
    // 1. ROOT MUST BE A STANDARD VIEW, NOT SafeAreaView!
    <AnimatedScreen>
    <View className="flex-1 bg-[#F2F2F7]"> 
      <StatusBar style="dark" />

      {/* 2. THE SCROLLING CONTENT */}
      <ScrollView 
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 150 }} 
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          closeAllSwipeables();
          closeAllShopSwipeables();
        }}
      >
        {/* SCROLLING HEADER CONTENT */}
        <View 
          className="px-6 flex-row justify-between items-center"
          style={{ paddingTop: insets.top + 16, paddingBottom: 4 }}
        >
          <View className="flex-row items-center gap-0">
            <Image source={require('../../assets/images/app-logo.png')} style={{ width: 110, height: 110, marginLeft: -24, marginRight: -16, marginTop: -37, marginBottom: -37 }} resizeMode="contain" />
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight" style={{ marginTop: 4 }}>GeoCart</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#94a3b8', marginTop: 2, letterSpacing: -0.1 }}>{shoppingLists.length === 0 ? 'No saved lists' : `${shoppingLists.length} saved list${shoppingLists.length !== 1 ? 's' : ''}`}</Text>
            </View>
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
              {shoppingLists.length > 3 && (
                <Animated.View layout={LinearTransition.springify()}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/lists'); }}
                    className="mx-6 mb-2 rounded-[20px] py-3.5 px-4 flex-row items-center justify-center border border-slate-200"
                    style={{
                      backgroundColor: '#ffffff'}}
                  >
                    <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600' }}>View All Lists</Text>
                    <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>
          )}

          {/* 4. My Shops Section */}
          <Animated.View layout={LinearTransition.springify()} className="flex-row items-center justify-between mx-6 mt-4 mb-3">
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: '#0f172a' }}>Shops</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#94a3b8', marginTop: 2, letterSpacing: -0.1 }}>{savedShops.length === 0 ? 'No saved shops' : `${savedShops.length} saved shop${savedShops.length !== 1 ? 's' : ''}`}</Text>
            </View>
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
          {savedShops.length > 3 && (
            <Animated.View layout={LinearTransition.springify()}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}
                className="mx-6 mb-2 rounded-[20px] py-3.5 px-4 flex-row items-center justify-center border border-slate-200"
                style={{
                  backgroundColor: '#ffffff'}}
              >
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600' }}>View All Shops</Text>
                <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </Animated.View>
          )}



          {/* 5. Secondary "Premium" Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-8 bg-white rounded-[36px] p-8 min-h-[180px] relative overflow-hidden border border-slate-100"
            
          >
            <Text className="text-[18px] font-bold text-slate-900 tracking-tight z-10">Categories</Text>
            
            {/* Blurred background circles simulation */}
            <View className="absolute inset-0 items-center justify-center opacity-30">
              <View className="w-32 h-32 bg-red-100 rounded-full blur-3xl absolute -left-10 opacity-70" />
              <View className="w-40 h-40 bg-blue-100 rounded-full blur-3xl absolute -right-10 opacity-70" />
            </View>

            <View className="absolute inset-0 items-center justify-center z-20">
              <TouchableOpacity 
                onPress={() => hapticImpact(Haptics.ImpactFeedbackStyle.Light)}
                className="bg-[#D4AF37] rounded-full px-6 py-3 flex-row items-center gap-2.5"
                
              >
                <Sparkles size={18} color="#1e1e1e" fill="#1e1e1e" />
                <Text className="text-[#1e1e1e] font-bold text-[15px] tracking-wide">Premium</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          {/* Pagination dots */}
          <Animated.View layout={LinearTransition.springify()} className="flex-row justify-center mt-6 gap-2.5">
            <View className="w-2 h-2 rounded-full bg-slate-900" />
            <View className="w-2 h-2 rounded-full bg-slate-200" />
            <View className="w-2 h-2 rounded-full bg-slate-200" />
          </Animated.View>

          {/* 6. "Recently Uploaded" Section */}
          <Animated.View layout={LinearTransition.springify()}>
            <Text className="text-[22px] font-extrabold tracking-tight mx-6 mt-10 mb-4 text-slate-900">Recently uploaded</Text>
          </Animated.View>
          
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 bg-white rounded-[36px] p-8 items-center border border-slate-100"
            
          >
            <View 
              className="bg-white rounded-[24px] w-[90%] p-5 flex-row items-center gap-4 border border-slate-50"
              
            >
              <View className="w-[52px] h-[52px] rounded-full bg-slate-50 items-center justify-center border border-slate-100">
                 <Text style={{fontSize: 24}}>🥗</Text>
              </View>
              <View className="flex-1 gap-3">
                <View className="w-32 h-2.5 bg-slate-100 rounded-full" />
                <View className="w-20 h-2.5 bg-slate-100 rounded-full" />
              </View>
            </View>
            <Text className="text-slate-500 text-[15px] font-medium tracking-wide mt-8">Tap + to add your first shopping list</Text>
          </Animated.View>
        </ScrollView>

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
