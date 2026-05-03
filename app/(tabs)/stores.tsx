import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, ChevronRight, Search, SlidersHorizontal, ShoppingBasket, LocateFixed, Trash2, MapPin } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { fetchMarkets } from '../../services/overpassService';
import { useLocationStore } from '../../store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Zustand persisted store
  const { locations, addLocation, removeLocation } = useLocationStore();
  const savedShops = locations ?? [];

  const snapPoints = useMemo(() => {
    const HEADER_HEIGHT = 80;       // handle + "Saved Shops" title
    const CARD_HEIGHT = 82;         // each shop card (~54 icon + padding + margin)
    const HINT_CARD_HEIGHT = 100;   // placeholder hint card
    const EMPTY_STATE_HEIGHT = 170; // empty-state block
    const BOTTOM_PADDING = 32;      // breathing room at the bottom

    let contentHeight: number;

    if (savedShops.length === 0) {
      contentHeight = HEADER_HEIGHT + EMPTY_STATE_HEIGHT + BOTTOM_PADDING;
    } else {
      contentHeight =
        HEADER_HEIGHT +
        savedShops.length * CARD_HEIGHT +
        (savedShops.length < 3 ? HINT_CARD_HEIGHT : 0) +
        BOTTOM_PADDING;
    }

    // Convert to a percentage of screen height, clamped between 30% and 90%
    const maxPercent = Math.min(90, Math.max(30, Math.ceil((contentHeight / SCREEN_HEIGHT) * 100)));

    // Build snap points: always start at 30%, add a middle point if useful, then the dynamic max
    const points: string[] = ['30%'];
    if (maxPercent > 50) {
      points.push('50%');
    }
    if (maxPercent > 30) {
      points.push(`${maxPercent}%`);
    }

    return points;
  }, [savedShops.length]);

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);
  const animatedLocateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - 66 }],
  }));

  const [markets, setMarkets] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [selectedShopToSave, setSelectedShopToSave] = useState<any>(null);



  const isShopSaved = useCallback((market: any) => {
    return savedShops.some(
      (shop) =>
        shop.name === market.name &&
        Math.abs(shop.latitude - market.latitude) < 0.0005 &&
        Math.abs(shop.longitude - market.longitude) < 0.0005
    );
  }, [savedShops]);

  const fetchMarketsFromOverpass = async (region: any) => {
    if (region.latitudeDelta > 0.15) {
      console.log("Zoomed out too far, skipping fetch.");
      return;
    }

    try {
      const minDelta = 0.04;
      const latDelta = Math.max(region.latitudeDelta, minDelta);
      const lonDelta = Math.max(region.longitudeDelta, minDelta);

      const south = region.latitude - latDelta / 2;
      const west = region.longitude - lonDelta / 2;
      const north = region.latitude + latDelta / 2;
      const east = region.longitude + lonDelta / 2;

      const fetchedMarkets = await fetchMarkets(south, west, north, east);
      setMarkets(fetchedMarkets);
    } catch (error: any) {
      console.log('Error fetching from Overpass:', error);
    }
  };

  const handleRegionChangeComplete = (region: any) => {
    setCurrentRegion(region);
    fetchMarketsFromOverpass(region);
  };

  const handleLocateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});

      const latitudeDelta = 0.04;
      const longitudeDelta = 0.04;
      const actualLatitude = location.coords.latitude;
      const actualLongitude = location.coords.longitude;

      // Calculate adjusted latitude to shift visual center above bottom sheet
      const adjustedLatitude = actualLatitude - (latitudeDelta * 0.25);

      const newRegion = {
        latitude: adjustedLatitude,
        longitude: actualLongitude,
        latitudeDelta,
        longitudeDelta,
      };

      mapRef.current?.animateToRegion(newRegion, 1000);

      // Fetch markets around actual location
      fetchMarketsFromOverpass({
        latitude: actualLatitude,
        longitude: actualLongitude,
        latitudeDelta,
        longitudeDelta
      });
    } catch (error) {
      console.warn('Error fetching location', error);
    }
  };

  useEffect(() => {
    handleLocateMe();
  }, []);

  // Close any open swipeable when another one opens
  const closeAllSwipeables = (exceptId?: string) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  };

  const renderRightActions = (locId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteAction}
        activeOpacity={0.7}
        onPress={() => {
          removeLocation(locId);
          swipeableRefs.current.delete(locId);
        }}
      >
        <View style={styles.swipeDeleteInner}>
          <Trash2 size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Full Screen Background Map */}
      <MapView
        ref={mapRef}
        userInterfaceStyle="light"
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 41.0082,
          longitude: 28.9784,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={true}
        followsUserLocation={false}
        showsPointsOfInterest={false}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={() => setSelectedShopToSave(null)}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedShopToSave(null);
          }
        }}
      >
        {markets.map(market => {
          const saved = isShopSaved(market);
          return (
            <Marker
              key={market.id}
              coordinate={{ latitude: market.latitude, longitude: market.longitude }}
              title={market.name}
              onPress={(e) => {
                e.stopPropagation();
                if (!saved) {
                  setSelectedShopToSave(market);
                  bottomSheetRef.current?.snapToIndex(snapPoints.length - 1);
                } else {
                  setSelectedShopToSave(null);
                }
              }}
            >
              <View style={[styles.markerPill, saved && styles.markerPillSaved]}>
                <ShoppingBasket size={18} color={saved ? '#fff' : '#0f172a'} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Top Bar */}
      <View
        style={[styles.floatingHeader, { top: Math.max(20, insets.top) }]}
        className="flex-row items-center px-4"
      >
        <View className="flex-1 bg-white/95 rounded-full h-14 flex-row items-center px-4 shadow-lg border border-slate-100 mr-3 shadow-black/10">
          <Search size={22} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-[16px] text-slate-900 font-medium h-full"
            placeholder="Search stores nearby..."
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity className="bg-white/95 w-14 h-14 rounded-full items-center justify-center shadow-lg border border-slate-100 shadow-black/10">
          <SlidersHorizontal size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Locate Me Button */}
      <Animated.View style={[styles.locateButtonContainer, animatedLocateStyle]}>
        <TouchableOpacity
          style={styles.locateButton}
          onPress={handleLocateMe}
          activeOpacity={0.8}
        >
          <LocateFixed size={24} color="#0f172a" />
        </TouchableOpacity>
      </Animated.View>

      {/* Draggable Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={Math.min(1, snapPoints.length - 1)}
        animatedPosition={animatedPosition}
        snapPoints={snapPoints}
        handleComponent={useCallback(() => (
          <Animated.View layout={LinearTransition.springify()} className="w-full pt-5 pb-2 px-6">
            {selectedShopToSave && (
              <Animated.View
                entering={FadeInDown.duration(300).springify()}
                exiting={FadeOutUp.duration(200)}
              >
                <TouchableOpacity
                  style={styles.contextSaveBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    addLocation({
                      name: selectedShopToSave.name || 'Unknown Store',
                      address: selectedShopToSave.address || 'Unknown Address',
                      latitude: selectedShopToSave.latitude,
                      longitude: selectedShopToSave.longitude,
                      radius: 500,
                    });
                    setSelectedShopToSave(null);
                  }}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.contextSaveBtnText}>
                    Save {selectedShopToSave.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            <Animated.Text 
              layout={LinearTransition.springify()} 
              className="text-[22px] font-extrabold tracking-tight text-slate-900"
            >
              Saved Shops
            </Animated.Text>
          </Animated.View>
        ), [selectedShopToSave, addLocation])}
        backgroundStyle={{
          borderRadius: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 15,
          backgroundColor: '#f8fafc'
        }}
      >

        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state */}
          {savedShops.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Store size={32} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No saved shops yet</Text>
              <Text style={styles.emptySub}>Tap a marker on the map to save your favourite shops</Text>
            </View>
          )}

          {/* Saved shop cards with swipe-to-delete */}
          {savedShops.map((loc) => (
            <Swipeable
              key={loc.id}
              ref={(ref) => {
                if (ref) {
                  swipeableRefs.current.set(loc.id, ref);
                } else {
                  swipeableRefs.current.delete(loc.id);
                }
              }}
              renderRightActions={() => renderRightActions(loc.id)}
              rightThreshold={40}
              overshootRight={false}
              friction={2}
              onSwipeableWillOpen={() => closeAllSwipeables(loc.id)}
            >
              <TouchableOpacity
                className="mb-3.5 bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-100 shadow-sm"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}
                activeOpacity={0.7}
                onPress={() => {
                  const latitudeDelta = 0.01;
                  const longitudeDelta = 0.01;
                  const adjustedLatitude = loc.latitude - (latitudeDelta * 0.25);
                  const region = {
                    latitude: adjustedLatitude,
                    longitude: loc.longitude,
                    latitudeDelta,
                    longitudeDelta,
                  };
                  mapRef.current?.animateToRegion(region, 800);
                  bottomSheetRef.current?.snapToIndex(0);
                }}
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View style={styles.shopIcon}>
                    <Store size={22} color="#0f172a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-bold text-slate-900 tracking-tight mb-0.5">{loc.name}</Text>
                    <Text className="text-[13px] font-medium text-slate-500" numberOfLines={1}>
                      {`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2 pl-2">
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            </Swipeable>
          ))}

          {/* Hint/Placeholder Card — shown when fewer than 3 shops saved */}
          {savedShops.length > 0 && savedShops.length < 3 && (
            <View style={styles.hintCard}>
              <MapPin size={28} color="#BDBDBD" />
              <Text style={styles.hintText}>Tap a map marker to add more shops</Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  locateButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 16,
    zIndex: 10,
  },
  locateButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  /* ── Map marker ────────────────────────── */
  markerPill: {
    backgroundColor: '#ffffff',
    padding: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  markerPillSaved: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },

  /* ── Empty state ───────────────────────── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Saved shop card extras ────────────── */
  shopIcon: {
    backgroundColor: '#f8fafc',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  /* ── Swipe-to-delete action ────────────── */
  swipeDeleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  swipeDeleteInner: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: '100%',
    borderRadius: 24,
    marginLeft: 8,
    gap: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Hint / Placeholder Card ─────────── */
  hintCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    marginTop: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#BDBDBD',
    marginTop: 10,
  },

  /* ── Context save button ───────────────── */
  contextSaveBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  contextSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
