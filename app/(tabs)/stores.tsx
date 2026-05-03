import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, ChevronRight, Search, SlidersHorizontal, ShoppingBasket, LocateFixed, Trash2, X } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { fetchMarkets } from '../../services/overpassService';
import { useLocationStore } from '../../store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['30%', '50%', '90%'], []);

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);
  const animatedLocateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - 66 }],
  }));

  const [markets, setMarkets] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedShopToSave, setSelectedShopToSave] = useState<any>(null);

  // Zustand persisted store
  const { locations: savedShops, addLocation, removeLocation } = useLocationStore();

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
                  bottomSheetRef.current?.snapToIndex(1);
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
        index={1}
        animatedPosition={animatedPosition}
        snapPoints={snapPoints}
        handleComponent={useCallback(() => (
          <View className="w-full pt-5 pb-2 px-6">
            {selectedShopToSave && (
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
            )}
            <Text className="text-[22px] font-extrabold tracking-tight text-slate-900">Saved Shops</Text>
          </View>
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
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

          {/* Saved shop cards */}
          {savedShops.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              className="mb-3.5 bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-100 shadow-sm"
              style={[
                { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
                deleteMode && styles.deleteCard,
              ]}
              onPress={() => {
                if (deleteMode) {
                  removeLocation(loc.id);
                  return;
                }
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
                <View
                  style={[
                    styles.shopIcon,
                    deleteMode && styles.shopIconDelete,
                  ]}
                >
                  {deleteMode ? (
                    <Trash2 size={22} color="#ef4444" />
                  ) : (
                    <Store size={22} color="#0f172a" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-slate-900 tracking-tight mb-0.5">{loc.name}</Text>
                  <Text className="text-[13px] font-medium text-slate-500" numberOfLines={1}>
                    {deleteMode ? 'Tap to remove' : `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2 pl-2">
                {deleteMode ? (
                  <X size={18} color="#ef4444" />
                ) : (
                  <ChevronRight size={18} color="#cbd5e1" />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Split action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add New Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, deleteMode && styles.deleteBtnActive]}
              activeOpacity={0.8}
              onPress={() => setDeleteMode(!deleteMode)}
            >
              <Trash2 size={20} color={deleteMode ? '#fff' : '#ef4444'} />
              <Text style={[styles.deleteBtnText, deleteMode && styles.deleteBtnTextActive]}>
                {deleteMode ? 'Done' : 'Delete Shop'}
              </Text>
            </TouchableOpacity>
          </View>
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
  shopIconDelete: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  deleteCard: {
    borderColor: '#fecaca',
  },

  /* ── Split action buttons ──────────────── */
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
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addBtn: {
    flex: 1,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  deleteBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtnTextActive: {
    color: '#fff',
  },
});
