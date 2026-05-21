import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, ChevronRight, Search, SlidersHorizontal, ShoppingBasket, LocateFixed, Trash2, MapPin, X } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, FadeInDown, FadeOutUp, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Supercluster, { PointFeature } from 'supercluster';
import { fetchMarkets } from '../../services/overpassService';
import { useLocationStore } from '../../store';
import AnimatedScreen from '../../components/AnimatedScreen';
import * as Haptics from 'expo-haptics';
import MapCluster from '../../components/MapCluster';
import StoreMarker from '../../components/StoreMarker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const markerRefs = useRef<Record<string, any>>({});
  const lastTap = useRef(0);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Screen is losing focus, hide all open callouts to prevent glitching on iOS
        Object.values(markerRefs.current).forEach((marker) => {
          if (marker && typeof marker.hideCallout === 'function') {
            marker.hideCallout();
          }
        });
      };
    }, [])
  );

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

  // ── Search focus animation state ──
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchFocus = useSharedValue(0); // 0 = idle, 1 = focused

  const SPRING_CONFIG = { damping: 20, stiffness: 180, mass: 0.8 };

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    searchFocus.value = withSpring(1, SPRING_CONFIG);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const dismissSearch = useCallback(() => {
    searchInputRef.current?.blur();
    setIsSearchFocused(false);
    setSearchText('');
    searchFocus.value = withSpring(0, SPRING_CONFIG);
    Keyboard.dismiss();
  }, []);

  // Animated styles for the "Shops" title
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocus.value, [0, 0.5], [1, 0]),
    transform: [
      { translateX: interpolate(searchFocus.value, [0, 1], [0, -20]) },
      { scale: interpolate(searchFocus.value, [0, 1], [1, 0.8]) },
    ],
  }));

  // Animated styles for the filter button
  const filterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocus.value, [0, 0.5], [1, 0]),
    transform: [
      { translateX: interpolate(searchFocus.value, [0, 1], [0, 20]) },
      { scale: interpolate(searchFocus.value, [0, 1], [1, 0.8]) },
    ],
  }));

  // Animated styles for the search bar container
  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    marginLeft: interpolate(searchFocus.value, [0, 1], [12, 0]),
    marginRight: interpolate(searchFocus.value, [0, 1], [12, 0]),
  }));

  // Cancel button animated style
  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchFocus.value,
    transform: [
      { translateX: interpolate(searchFocus.value, [0, 1], [30, 0]) },
    ],
    width: interpolate(searchFocus.value, [0, 1], [0, 60]),
  }));

  // Map blur overlay animated style
  const mapBlurAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocus.value, [0, 1], [0, 1]),
  }));

  // Bottom sheet push-down animated style
  const bottomSheetPushStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(searchFocus.value, [0, 1], [0, 40]) },
    ],
  }));

  const [markets, setMarkets] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [selectedShopToSave, setSelectedShopToSave] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Clustering state
  const superclusterRef = useRef(new Supercluster({
    radius: 45,
    maxZoom: 16,
  }));
  const [clusters, setClusters] = useState<any[]>([]);

  // Haversine formula
  const haversineDistance = (
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371000;
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



  const isShopSaved = useCallback((market: any) => {
    return savedShops.some(
      (shop) =>
        shop.name === market.name &&
        Math.abs(shop.latitude - market.latitude) < 0.0005 &&
        Math.abs(shop.longitude - market.longitude) < 0.0005
    );
  }, [savedShops]);

  const fetchAbortController = useRef<AbortController | null>(null);

  const fetchMarketsFromOverpass = async (region: any) => {
    // 0.08 delta is roughly an 8km box. Beyond this, Overpass takes way too long.
    if (region.latitudeDelta > 0.08) {
      console.log("Zoomed out too far, skipping fetch.");
      return;
    }

    // Cancel any ongoing fetch to prevent queue pile-up and overloading
    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    const controller = new AbortController();
    fetchAbortController.current = controller;

    try {
      const minDelta = 0.04;
      const latDelta = Math.max(region.latitudeDelta, minDelta);
      const lonDelta = Math.max(region.longitudeDelta, minDelta);

      const south = region.latitude - latDelta / 2;
      const west = region.longitude - lonDelta / 2;
      const north = region.latitude + latDelta / 2;
      const east = region.longitude + lonDelta / 2;

      const fetchedMarkets = await fetchMarkets(south, west, north, east, controller.signal);
      if (!fetchedMarkets || fetchedMarkets.length === 0) return;

      setMarkets(prev => {
        const combined = [...prev, ...fetchedMarkets];
        // Deduplicate by ID so markers don't stack and we keep existing ones
        const unique = combined.filter(
          (market, index, self) => index === self.findIndex((m) => m.id === market.id)
        );
        // Only update state if the array actually changed to prevent unnecessary re-renders
        if (unique.length === prev.length) return prev;
        return unique;
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        console.log('Previous overpass fetch aborted due to new map pan.');
      } else {
        console.log('Error fetching from Overpass:', error);
      }
    }
  };

  const handleRegionChangeComplete = (region: any) => {
    setCurrentRegion(region);
    updateClusters(region);
    fetchMarketsFromOverpass(region);
  };

  const points = useMemo(() => {
    const allPoints: PointFeature<any>[] = [];
    
    // Add saved shops
    savedShops.forEach(shop => {
      allPoints.push({
        type: 'Feature',
        properties: {
          ...shop,
          cluster: false,
          id: `saved-${shop.id}`,
          isSaved: true
        },
        geometry: {
          type: 'Point',
          coordinates: [shop.longitude, shop.latitude]
        }
      });
    });

    // Add unsaved markets
    const uniqueMarkets = markets
      .filter((market, index, self) => 
        index === self.findIndex((m) => m.latitude === market.latitude && m.longitude === market.longitude)
      )
      .filter((market) => !isShopSaved(market));

    uniqueMarkets.forEach(market => {
      allPoints.push({
        type: 'Feature',
        properties: {
          ...market,
          cluster: false,
          id: market.id,
          isSaved: false
        },
        geometry: {
          type: 'Point',
          coordinates: [market.longitude, market.latitude]
        }
      });
    });

    return allPoints;
  }, [savedShops, markets, isShopSaved]);

  const updateClusters = useCallback((region: any) => {
    if (!region) return;
    const padding = region.longitudeDelta * 0.5; // Load markers slightly outside the view
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2 - padding,
      region.latitude - region.latitudeDelta / 2 - padding,
      region.longitude + region.longitudeDelta / 2 + padding,
      region.latitude + region.latitudeDelta / 2 + padding,
    ];
    
    const lngDelta = Math.max(region.longitudeDelta, 0.0001);
    const zoom = Math.max(0, Math.round(Math.log(360 / lngDelta) / Math.LN2));
    
    try {
      const newClusters = superclusterRef.current.getClusters(bbox, zoom);
      setClusters(newClusters);
    } catch (error) {
      console.log("Supercluster error:", error);
    }
  }, []);

  useEffect(() => {
    superclusterRef.current.load(points);
    updateClusters(currentRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]); // Deliberately omitting currentRegion to prevent reloading the entire KD-tree on every pan

  const handleLocateMe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});

      const latitudeDelta = 0.04;
      const longitudeDelta = 0.04;
      const actualLatitude = location.coords.latitude;
      const actualLongitude = location.coords.longitude;
      
      setUserLocation({ latitude: actualLatitude, longitude: actualLongitude });

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
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeLocation(locId);
          swipeableRefs.current.delete(locId);
        }}
      >
        <View style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', width: 80, height: '100%', borderRadius: 16 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', paddingRight: 16 }}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedScreen>
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
        onPanDrag={() => {
          setSelectedShopToSave(null);
          Keyboard.dismiss();
        }}
        onPress={(e) => {
          Keyboard.dismiss();
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedShopToSave(null);
          }
        }}
      >
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;
          const clusterId = cluster.id;

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${clusterId}`}
                coordinate={{ latitude, longitude }}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Keyboard.dismiss();
                  
                  const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId);
                  const longitudeDelta = 360 / Math.pow(2, zoom);
                  const latitudeDelta = longitudeDelta * (SCREEN_HEIGHT / Dimensions.get('window').width);
                  
                  mapRef.current?.animateToRegion({
                    latitude,
                    longitude,
                    latitudeDelta,
                    longitudeDelta,
                  }, 500);
                }}
              >
                <MapCluster pointCount={pointCount} onPress={() => {}} />
              </Marker>
            );
          }

          // Not a cluster, it's an individual marker
          const properties = cluster.properties;
          const isSaved = properties.isSaved;
          const isSelected = selectedShopToSave?.id === properties.id || (isSaved && selectedShopToSave?.id === `saved-${properties.id}`);

          return (
            <Marker
              key={properties.id}
              ref={(ref) => {
                if (ref) markerRefs.current[properties.id] = ref;
              }}
              coordinate={{ latitude, longitude }}
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
                const now = Date.now();
                if (now - lastTap.current < 300) return;
                lastTap.current = now;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                
                if (isSaved) {
                  setSelectedShopToSave(null);
                } else {
                  setSelectedShopToSave(properties);
                }
              }}
            >
              <StoreMarker isSaved={isSaved} isSelected={isSelected} />
            </Marker>
          );
        })}
      </MapView>

      {/* ── Animated Search Blur Overlay ── */}
      <Animated.View
        pointerEvents={isSearchFocused ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFillObject, { zIndex: 5 }, mapBlurAnimatedStyle]}
      >
        <BlurView intensity={18} tint="light" style={[StyleSheet.absoluteFillObject]}>
          <TouchableWithoutFeedback onPress={dismissSearch}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(248,250,252,0.3)' }]} />
          </TouchableWithoutFeedback>
        </BlurView>
      </Animated.View>

      {/* ── Animated Top Navigation Bar ── */}
      <View
        style={[styles.floatingHeader, { top: Math.max(20, insets.top), zIndex: 15 }]}
      >
        <View style={styles.glassContainer}>
          <View style={styles.topNavRow}>
            {/* "Shops" Title */}
            <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
              <Text style={styles.titleText}>Shops</Text>
            </Animated.View>

            {/* Animated Search Bar */}
            <Animated.View style={[styles.searchBarOuter, searchBarAnimatedStyle]}>
              <View style={styles.searchBarInner}>
                <Search size={17} color="#94a3b8" strokeWidth={2.5} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search shops..."
                  placeholderTextColor="#94a3b8"
                  value={searchText}
                  onChangeText={setSearchText}
                  onFocus={handleSearchFocus}
                  returnKeyType="search"
                />
                {isSearchFocused && searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View style={styles.clearButton}>
                      <X size={10} color="#64748b" strokeWidth={3} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            {/* Filter Button */}
            <Animated.View style={[styles.filterContainer, filterAnimatedStyle]}>
              <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
                <SlidersHorizontal size={18} color="#334155" strokeWidth={2.5} />
              </TouchableOpacity>
            </Animated.View>

            {/* Cancel Button (visible when focused) */}
            <Animated.View style={[{ overflow: 'hidden' }, cancelAnimatedStyle]}>
              <TouchableOpacity onPress={dismissSearch} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Locate Me Button */}
      <Animated.View style={[styles.locateButtonContainer, animatedLocateStyle]}>
        <View style={styles.locateButtonSurface}>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={handleLocateMe}
            activeOpacity={0.7}
          >
            <LocateFixed size={20} color="#334155" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Draggable Bottom Sheet */}
      <Animated.View style={[{ flex: 1, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 }, bottomSheetPushStyle]} pointerEvents="box-none">
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              className="text-[22px] font-semibold tracking-tight text-slate-900"
            >
              My Shops
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            closeAllSwipeables();
          }}
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
            <Animated.View
              key={loc.id}
              layout={LinearTransition.springify()}
              exiting={FadeOutLeft.duration(200)}
            >
              <Swipeable
                containerStyle={{ marginBottom: 14 }}
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
                  className="bg-white rounded-[24px] py-3.5 px-4 flex-row items-center justify-between border border-slate-100"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.03,
                    shadowRadius: 24,
                    elevation: 3,
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Keyboard.dismiss();
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
                  <View className="flex-row items-center gap-3.5 flex-1">
                    <View className="w-10 h-10 bg-slate-100/60 rounded-[12px] items-center justify-center">
                      <Store size={20} color="#475569" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-slate-900 tracking-tight" numberOfLines={1}>{loc.name}</Text>
                      <Text className="text-[13px] font-medium text-slate-500 mt-0.5" numberOfLines={1}>
                        {userLocation ? formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, loc.latitude, loc.longitude)) : (loc.address || 'Saved Shop')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </Swipeable>
            </Animated.View>
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
      </Animated.View>
    </View>
    </AnimatedScreen>
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
    paddingHorizontal: 16,
  },
  glassContainer: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  titleContainer: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  searchBarOuter: {
    height: 38,
  },
  searchBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    height: '100%',
    letterSpacing: -0.2,
  },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 10,
    letterSpacing: -0.2,
  },
  locateButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 16,
    zIndex: 10,
  },
  locateButtonSurface: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  locateButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
