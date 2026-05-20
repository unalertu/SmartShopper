import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Store, ShoppingBag, Crown, Plus, Home, Users, User, Menu, ChevronRight, Radar, BellRing, MapPin, X, PlusCircle, MapPinPlus, CheckCircle, Settings, ScanBarcode } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ProgressiveBlur from '../../components/ProgressiveBlur';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { fetchMarkets } from '../../services/overpassService';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { useLocationStore, useListsStore } from '../../store';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import AnimatedScreen from '../../components/AnimatedScreen';
import RadarPinIcon from '../../components/RadarPinIcon';

const getRelativeDate = (timestamp?: number): string => {
  if (!timestamp) return 'bugün';
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return `${Math.floor(days / 30)} ay önce`;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nearbyStore, setNearbyStore] = useState<string>('Searching location...');
  const [isNearStore, setIsNearStore] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

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

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setNearbyStore('Location permission denied');
          setIsNearStore(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const userLat = location.coords.latitude;
        const userLon = location.coords.longitude;
        setUserLocation({ latitude: userLat, longitude: userLon });

        // Search within ~1.5 km radius to speed up initial load
        let offset = 0.015;
        let s = userLat - offset;
        let n = userLat + offset;
        let w = userLon - offset;
        let e = userLon + offset;

        let markets = await fetchMarkets(s, w, n, e);

        // Fallback: widen to ~5.5 km if nothing found
        if (!markets || markets.length === 0) {
          offset = 0.05;
          s = userLat - offset;
          n = userLat + offset;
          w = userLon - offset;
          e = userLon + offset;
          markets = await fetchMarkets(s, w, n, e);
        }
        if (markets && markets.length > 0) {
          // Find the nearest store by Haversine distance
          let nearest = markets[0];
          let minDist = haversineDistance(userLat, userLon, nearest.latitude, nearest.longitude);

          for (let i = 1; i < markets.length; i++) {
            const dist = haversineDistance(userLat, userLon, markets[i].latitude, markets[i].longitude);
            if (dist < minDist) {
              minDist = dist;
              nearest = markets[i];
            }
          }

          setNearbyStore(`${nearest.name} is ${formatDistance(minDist)}`);
          setIsNearStore(true);
        } else {
          setNearbyStore('No stores nearby');
          setIsNearStore(false);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
          console.log('Nearby store fetch timed out (expected in slow network/large area).');
        } else {
          console.error('Error fetching nearby store:', error);
        }
        setNearbyStore('Could not find stores');
        setIsNearStore(false);
      }
    })();
  }, []);

  const { lists: shoppingLists, addList, removeList } = useListsStore();

  const newListBottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['35%'], []);
  const [newListName, setNewListName] = useState('');

  const handlePresentModalPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    newListBottomSheetRef.current?.present();
  }, []);

  const handleCloseModalPress = useCallback(() => {
    newListBottomSheetRef.current?.dismiss();
    setNewListName('');
  }, []);

  const handleAddList = () => {
    if (newListName.trim()) {
      addList(newListName.trim());
      setNewListName('');
      newListBottomSheetRef.current?.dismiss();
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Shared Zustand store for saved shops (synced with Stores page)
  const { locations: savedShops, removeLocation } = useLocationStore();

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    <View className="flex-1 bg-slate-50"> 
      <StatusBar style="dark" />

      {/* 2. THE SCROLLING CONTENT */}
      <ScrollView 
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
          style={{ paddingTop: insets.top + 16, paddingBottom: 20 }}
        >
          <View className="flex-row items-center gap-2">
            <Image source={require('../../assets/images/app-logo.png')} style={{ width: 36, height: 36, marginLeft: 0, marginTop: 0 }} resizeMode="contain" />
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight" style={{ marginTop: 4 }}>Smart Shopper</Text>
          </View>

        </View>

        {/* 2. THE MAP WIDGET */}
          {/* Smart Status Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-2 mb-5 rounded-[36px] bg-white border border-slate-100 overflow-hidden"
            style={{
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.03,
              shadowRadius: 24,
              elevation: 3,
            }}
          >
            {/* Map Widget Always Visible */}
            <View className="flex-col">
              {/* Upper Tier: Dynamic Map Preview */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}>
                <View className="w-full h-60 rounded-t-[36px] overflow-hidden" pointerEvents="none">
                  {userLocation ? (
                    <MapView
                      style={{ width: '100%', height: '100%' }}
                      userInterfaceStyle="light"
                      showsUserLocation={true}
                      initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}
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
                          <View className="bg-slate-900 p-1.5 rounded-full border border-slate-100" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 }}>
                            <Store size={14} color="#fff" />
                          </View>
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
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}
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
                  <Text className="text-[15px] font-semibold text-slate-900 tracking-tight">{nearbyStore}</Text>
                </View>

              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 3. My Lists Section */}
          <Animated.View layout={LinearTransition.springify()}>
            <Text className="text-[22px] font-extrabold tracking-tight mx-6 mb-4 text-slate-900">My Lists</Text>
          </Animated.View>
          {shoppingLists.map((list) => (
            <Animated.View
              key={list.id}
              layout={LinearTransition.springify()}
              exiting={FadeOutLeft.duration(200)}
            >
              <Swipeable
                containerStyle={{ marginHorizontal: 24, marginBottom: 12 }}
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/list/${list.id}`); }}
                  className="bg-white rounded-[24px] py-3.5 px-4 flex-row items-center justify-between border border-slate-100"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.03,
                    shadowRadius: 24,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center gap-3.5 flex-1">
                    <View className="w-10 h-10 bg-slate-100/60 rounded-[12px] items-center justify-center">
                      <Menu size={20} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-slate-900 tracking-tight" numberOfLines={1}>{list.name}</Text>
                      <Text className="text-[13px] font-medium text-slate-500 mt-0.5" numberOfLines={1}>{list.count} ürün • Güncellendi {getRelativeDate(list.createdAt)}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
          ))}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-6 mt-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePresentModalPress}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add List</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 4. My Shops Section */}
          <Animated.View layout={LinearTransition.springify()}>
            <Text className="text-[22px] font-extrabold tracking-tight mx-6 mt-6 mb-4 text-slate-900">My Shops</Text>
          </Animated.View>
          {savedShops.length === 0 && (
            <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-5">
              <View
                className="rounded-[28px] p-8 items-center border border-dashed border-slate-200"
                style={{ backgroundColor: '#f8fafc' }}
              >
                <View className="bg-white border border-slate-100 w-14 h-14 rounded-full items-center justify-center mb-4" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
                  <Store size={24} color="#94a3b8" />
                </View>
                <Text className="text-[16px] font-semibold text-slate-600 tracking-tight">No saved shops yet</Text>
                <Text className="text-[14px] font-medium text-slate-400 mt-1.5 text-center px-4">Tap Add to save favorite locations from the map</Text>
              </View>
            </Animated.View>
          )}
          {savedShops.map((shop) => (
            <Animated.View
              key={shop.id}
              layout={LinearTransition.springify()}
              exiting={FadeOutLeft.duration(200)}
            >
              <Swipeable
                containerStyle={{ marginHorizontal: 24, marginBottom: 12 }}
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/stores`); }}
                  className="bg-white rounded-[24px] py-3.5 px-4 flex-row items-center justify-between border border-slate-100"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.03,
                    shadowRadius: 24,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center gap-3.5 flex-1">
                    <View className="w-10 h-10 bg-slate-100/60 rounded-[12px] items-center justify-center">
                      <Store size={20} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-slate-900 tracking-tight" numberOfLines={1}>{shop.name}</Text>
                      <Text className="text-[13px] font-medium text-slate-500 mt-0.5" numberOfLines={1}>
                        {userLocation ? formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude)) : (shop.address || 'Saved Shop')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
          ))}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-6 mt-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/stores'); }}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add Shop</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 5. Secondary "Premium" Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-8 bg-white rounded-[36px] p-8 min-h-[180px] relative overflow-hidden border border-slate-100"
            style={{
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.03,
              shadowRadius: 32,
              elevation: 4,
            }}
          >
            <Text className="text-[18px] font-bold text-slate-900 tracking-tight z-10">Categories</Text>
            
            {/* Blurred background circles simulation */}
            <View className="absolute inset-0 items-center justify-center opacity-30">
              <View className="w-32 h-32 bg-red-100 rounded-full blur-3xl absolute -left-10 opacity-70" />
              <View className="w-40 h-40 bg-blue-100 rounded-full blur-3xl absolute -right-10 opacity-70" />
            </View>

            <View className="absolute inset-0 items-center justify-center z-20">
              <TouchableOpacity 
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                className="bg-[#D4AF37] rounded-full px-6 py-3 flex-row items-center gap-2.5"
                style={{
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Crown size={18} color="#1e1e1e" fill="#1e1e1e" />
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
            style={{
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.02,
              shadowRadius: 24,
              elevation: 3,
            }}
          >
            <View 
              className="bg-white rounded-[24px] w-[90%] p-5 flex-row items-center gap-4 border border-slate-50"
              style={{
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 16,
                elevation: 2,
              }}
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
        <BottomSheetModal
          ref={newListBottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backdropComponent={renderBackdrop}
          enablePanDownToClose={true}
          handleIndicatorStyle={{ backgroundColor: '#cbd5e1', width: 40 }}
          backgroundStyle={{ borderRadius: 32 }}
        >
          <View className="flex-1 px-6 pt-2 pb-6 bg-white">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-bold text-slate-900 tracking-tight">Create New List</Text>
              <TouchableOpacity onPress={handleCloseModalPress} className="bg-slate-100 p-2 rounded-full">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <BottomSheetTextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name (e.g., Grocery, Weekly)..."
              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[16px] text-slate-900 mb-6 font-medium"
              placeholderTextColor="#94a3b8"
              autoFocus
              onSubmitEditing={handleAddList}
            />
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleAddList(); }}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create List</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetModal>
    </View>
    </AnimatedScreen>
  );
}
