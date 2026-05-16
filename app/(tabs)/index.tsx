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

        // Search within ~3.3 km radius
        let offset = 0.03;
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
      } catch (error) {
        console.error('Error fetching nearby store:', error);
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
      >
        {/* SCROLLING HEADER CONTENT */}
        <View 
          className="px-6 flex-row justify-between items-center"
          style={{ paddingTop: insets.top, paddingBottom: 12 }}
        >
          <View className="flex-row items-center gap-2">
            <Image source={require('../../assets/images/app-logo.png')} style={{ width: 36, height: 36, marginLeft: 0, marginTop: 0 }} resizeMode="contain" />
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight" style={{ marginTop: 6 }}>Smart Shopper</Text>
          </View>

        </View>

        {/* 2. THE MAP WIDGET */}
          {/* Smart Status Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-2 mb-6 rounded-[32px] bg-white border border-slate-200 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.04,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            {/* Map Widget Always Visible */}
            <View className="flex-col">
              {/* Upper Tier: Dynamic Map Preview */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}>
                <View className="w-full h-48 rounded-t-[32px] overflow-hidden" pointerEvents="none">
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
                    />
                  ) : (
                    <View className="w-full h-full bg-slate-200 items-center justify-center">
                      <Text className="text-slate-500 font-medium">Loading map...</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View className="h-[1px] w-full bg-slate-100" />

              {/* Lower Tier: Info & Action */}
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/stores'); }}
                className="flex-row justify-between items-center py-2 px-4"
              >
                <View className="flex-row items-center gap-4">
                  <View className="w-[52px] items-center justify-center">
                    <RadarPinIcon
                      size={22}
                      pinColor="#334155"
                      pulseColor={isNearStore ? '#22c55e' : '#64748b'}
                      active={isNearStore}
                    />
                  </View>
                  <Text className="text-[16px] font-bold text-slate-900 tracking-tight">{nearbyStore}</Text>
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
                  className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-200"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.04,
                    shadowRadius: 16,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-[52px] items-center justify-center">
                      <Menu size={28} color="#334155" />
                    </View>
                    <View>
                      <Text className="text-[16px] font-bold text-slate-900 tracking-tight">{list.name}</Text>
                      <Text className="text-[13px] font-medium text-slate-400 mt-1">{list.count} ürün • Güncellendi {getRelativeDate(list.createdAt)}</Text>
                    </View>
                  </View>
                  <ChevronRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
          ))}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-2 mt-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePresentModalPress}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 4. My Shops Section */}
          <Animated.View layout={LinearTransition.springify()}>
            <Text className="text-[22px] font-extrabold tracking-tight mx-6 mt-8 mb-4 text-slate-900">My Shops</Text>
          </Animated.View>
          {savedShops.length === 0 && (
            <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-4">
              <View
                className="rounded-[24px] p-6 items-center border border-dashed border-slate-200"
                style={{ backgroundColor: '#fafafa' }}
              >
                <View className="bg-slate-100 w-[56px] h-[56px] rounded-full items-center justify-center mb-3">
                  <Store size={24} color="#cbd5e1" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-400 tracking-tight">No saved shops yet</Text>
                <Text className="text-[13px] font-medium text-slate-300 mt-1">Tap Add to save shops from the map</Text>
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
                  className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-200"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.04,
                    shadowRadius: 16,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-[52px] items-center justify-center">
                      <Store size={28} color="#334155" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-slate-900 tracking-tight">{shop.name}</Text>
                      <Text className="text-[13px] font-medium text-slate-400 mt-1" numberOfLines={1}>{shop.address || 'Saved Shop'}</Text>
                    </View>
                  </View>
                  <ChevronRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
          ))}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-2 mt-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/stores'); }}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 5. Secondary "Premium" Card */}
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 mt-5 bg-white rounded-[32px] p-6 min-h-[160px] relative overflow-hidden border border-slate-200"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.04,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <Text className="text-[17px] font-bold text-slate-900 tracking-tight z-10">Categories</Text>
            
            {/* Blurred background circles simulation */}
            <View className="absolute inset-0 items-center justify-center opacity-40">
              <View className="w-32 h-32 bg-red-100 rounded-full blur-3xl absolute -left-10 opacity-70" />
              <View className="w-40 h-40 bg-blue-100 rounded-full blur-3xl absolute -right-10 opacity-70" />
            </View>

            <View className="absolute inset-0 items-center justify-center z-20">
              <TouchableOpacity 
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                className="bg-[#D4AF37] rounded-full px-5 py-2.5 flex-row items-center gap-2"
                style={{
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Crown size={18} color="#1e1e1e" fill="#1e1e1e" />
                <Text className="text-[#1e1e1e] font-bold text-sm tracking-wide">Premium</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          {/* Pagination dots */}
          <Animated.View layout={LinearTransition.springify()} className="flex-row justify-center mt-5 gap-2">
            <View className="w-[7px] h-[7px] rounded-full bg-slate-900" />
            <View className="w-[7px] h-[7px] rounded-full border border-slate-300 bg-transparent" />
            <View className="w-[7px] h-[7px] rounded-full border border-slate-300 bg-transparent" />
          </Animated.View>

          {/* 6. "Recently Uploaded" Section */}
          <Animated.View layout={LinearTransition.springify()}>
            <Text className="text-[22px] font-extrabold tracking-tight mx-6 mt-10 mb-4 text-slate-900">Recently uploaded</Text>
          </Animated.View>
          
          <Animated.View 
            layout={LinearTransition.springify()}
            className="mx-6 bg-white rounded-[32px] p-6 items-center border border-slate-200"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.03,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View 
              className="bg-white rounded-[20px] w-[85%] p-4 flex-row items-center gap-4 border border-slate-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center border border-slate-100">
                 <Text style={{fontSize: 22}}>🥗</Text>
              </View>
              <View className="flex-1 gap-2.5">
                <View className="w-32 h-2.5 bg-slate-200 rounded-full" />
                <View className="w-20 h-2.5 bg-slate-200 rounded-full" />
              </View>
            </View>
            <Text className="text-slate-400 text-sm font-medium tracking-wide mt-6">Tap + to add your first shopping list</Text>
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
