import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Linking, ActionSheetIOS } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, Search, ShoppingBasket, Navigation, Trash2, MapPin, X, Navigation2, MoreHorizontal, Bell, BellOff, Settings } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView, TouchableOpacity as BottomSheetTouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, runOnJS, FadeInDown, FadeOutUp, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Supercluster, { PointFeature } from 'supercluster';
import { fetchMarkets } from '../../services/overpassService';
import { mapCacheManager } from '../../services';
import { useLocationStore, useSettingsStore } from '../../store';
import AnimatedScreen from '../../components/AnimatedScreen';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import MapCluster from '../../components/MapCluster';
import StoreMarker from '../../components/StoreMarker';
import { MapSearchIndicator } from '../../components/MapSearchIndicator';
import { create } from 'zustand';
import { Alert } from 'react-native';
import { FREE_TIER, getMaxSavedStores } from '@/constants/tierConfig';
import ConfirmationSheet from '../../components/ConfirmationSheet';

interface LocalUIState {
  selectedShopToSave: any | null;
  setSelectedShopToSave: (shop: any | null) => void;
}
const useLocalUIStore = create<LocalUIState>((set) => ({
  selectedShopToSave: null,
  setSelectedShopToSave: (shop) => set({ selectedShopToSave: shop })
}));



const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// TrackedMarker Wrapper for isolating tracksViewChanges logic
const TrackedMarker = React.forwardRef(({ children, forceTrack, ...props }: any, ref: any) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (forceTrack) {
      setTracksViewChanges(true);
    } else {
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [forceTrack]);

  return (
    <Marker ref={ref} tracksViewChanges={tracksViewChanges} {...props}>
      {children}
    </Marker>
  );
});
TrackedMarker.displayName = 'TrackedMarker';


// Helper: show directions action sheet for a shop
function openDirectionsSheet(latitude: number, longitude: number) {
  const options = ['Cancel', 'Apple Maps', 'Google Maps', 'Yandex Maps'];
  const cancelButtonIndex = 0;

  ActionSheetIOS.showActionSheetWithOptions(
    {
      options,
      cancelButtonIndex,
      title: 'Get Directions',
      message: 'Choose a maps application'},
    async (index: number) => {
      if (index === cancelButtonIndex) return;

      if (index === 1) {
        // Apple Maps
        const url = `maps://?daddr=${latitude},${longitude}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://maps.apple.com/?daddr=${latitude},${longitude}`);
        }
      } else if (index === 2) {
        // Google Maps
        const nativeUrl = `comgooglemaps://?daddr=${latitude},${longitude}`;
        const canOpen = await Linking.canOpenURL(nativeUrl);
        if (canOpen) {
          Linking.openURL(nativeUrl);
        } else {
          Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
        }
      } else if (index === 3) {
        // Yandex Maps
        const nativeUrl = `yandexmaps://maps.yandex.com/?pt=${longitude},${latitude}&z=16`;
        const canOpen = await Linking.canOpenURL(nativeUrl);
        if (canOpen) {
          Linking.openURL(nativeUrl);
        } else {
          Linking.openURL(`https://yandex.com/maps/?pt=${longitude},${latitude}&z=16`);
        }
      }
    }
  );
}

// Helper: reverse-geocode coordinates into a clean, human-readable address
async function reverseGeocodeAddress(latitude: number, longitude: number): Promise<string> {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result && result.length > 0) {
      const loc = result[0];
      const candidates = [
        loc.neighborhood,
        loc.district,
        loc.subregion,
        loc.city
      ].filter(Boolean) as string[];

      const cleanCandidates = Array.from(new Set(candidates)).filter(c => !/\d/.test(c));

      if (cleanCandidates.length >= 2) {
        return `${cleanCandidates[0]}, ${cleanCandidates[1]}`;
      } else if (cleanCandidates.length === 1) {
        return cleanCandidates[0];
      }

      // Fallback to street, stripping numbers
      let fallback = loc.street || loc.name || '';
      fallback = fallback.replace(/\b\d+[a-zA-Z]*\b/g, '')
                         .replace(/Block\s*\d+/gi, '')
                         .replace(/Unit\s*\d+/gi, '')
                         .replace(/,\s*/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
      if (fallback) return fallback;
    }
  } catch (e) {
    console.log('Reverse geocode failed:', e);
  }
  return '';
}

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ shopId?: string }>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const bottomSheetScrollRef = useRef<any>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const markerRefs = useRef<Record<string, any>>({});
  const lastTap = useRef(0);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const tracksViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tracksViewId, setTracksViewId] = useState<string | null>(null);
  const [readyCalloutId, setReadyCalloutId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>(null);

  // Stable ref for fetchMarketsFromOverpass so memoized callbacks always call the latest version
  const fetchMarketsRef = useRef<(region: any) => void>(() => {});

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

  // ── Cleanup on unmount: abort in-flight fetches + clear all timers ──
  useEffect(() => {
    return () => {
      if (fetchAbortController.current) fetchAbortController.current.abort();
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      if (tracksViewTimerRef.current) clearTimeout(tracksViewTimerRef.current);
      if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
    };
  }, []);

  const { locations, addLocation, removeLocation, cachedMarkets, setCachedMarkets, isFetchingMarkets, setIsFetchingMarkets, canAddLocation, mutedUnsavedShops, toggleMuteUnsavedShop, canMuteShop, userLocation, setUserLocation } = useLocationStore();
  
  const savedShops = locations ?? [];
  const activeSavedShops = savedShops.filter(loc => loc.isActive !== false);
  const mutedSavedShops = savedShops.filter(loc => loc.isActive === false);

  const { distanceUnit, isPro } = useSettingsStore();

  const markets = cachedMarkets || [];
  const selectedShopToSave = useLocalUIStore((s) => s.selectedShopToSave);
  const setSelectedShopToSave = useLocalUIStore((s) => s.setSelectedShopToSave);

  const snapPoints = useMemo(() => {
    return [180, '40%', '70%'];
  }, []);

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);
  const animatedLocateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - 66 }]}));

  // ── Floating search button animation state ──
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchExpand = useSharedValue(0); // 0 = collapsed circle, 1 = expanded pill

  const SEARCH_SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
  const SEARCH_PILL_WIDTH = SCREEN_WIDTH * 0.65;
  const SEARCH_BUTTON_SIZE = 46;

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearchTap = useCallback(() => {
    setIsSearchFocused(true);
    searchExpand.value = withSpring(1, SEARCH_SPRING, (finished) => {
      if (finished) {
        runOnJS(focusSearchInput)();
      }
    });
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const dismissSearch = useCallback(() => {
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setSearchText('');
    searchExpand.value = withSpring(0, SEARCH_SPRING);
    // Delay state change so collapse animation is visible
    setTimeout(() => setIsSearchFocused(false), 300);
  }, []);

  // Floating search container animated style
  const floatingSearchStyle = useAnimatedStyle(() => ({
    width: interpolate(searchExpand.value, [0, 1], [SEARCH_BUTTON_SIZE, SEARCH_PILL_WIDTH]),
    height: interpolate(searchExpand.value, [0, 1], [SEARCH_BUTTON_SIZE, 44]),
    borderRadius: interpolate(searchExpand.value, [0, 1], [SEARCH_BUTTON_SIZE / 2, 22])}));

  // Search input container opacity
  const searchInputOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchExpand.value, [0.4, 1], [0, 1]),
    flex: 1}));

  // Search icon position shift
  const searchIconStyle = useAnimatedStyle(() => ({
    marginRight: interpolate(searchExpand.value, [0, 1], [0, 10])}));

  // Map blur overlay animated style
  const mapBlurAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchExpand.value, [0, 1], [0, 1])}));

  // Bottom sheet push-down animated style
  const bottomSheetPushStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(searchExpand.value, [0, 1], [0, 40]) },
    ]}));

  // Settings wheel animated style
  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchExpand.value, [0, 0.5], [1, 0]),
    transform: [{ translateX: interpolate(searchExpand.value, [0, 1], [0, 20]) }]
  }));

  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

  // Clustering state
  const superclusterRef = useRef(new Supercluster({
    radius: 45,
    maxZoom: 16}));
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
    if (distanceUnit === 'imperial') {
      const miles = meters / 1609.34;
      if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
      return `${miles.toFixed(1)} mi`;
    }
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
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
  const fetchedGridCellsRef = useRef<Set<string>>(new Set());
  const pendingGridCellsRef = useRef<Set<string>>(new Set());
  const lastFetchCenterRef = useRef<{latitude: number, longitude: number, latitudeDelta?: number, longitudeDelta?: number} | null>(null);
  const GRID_SIZE = 0.02; // Roughly 2km x 2km grid
  const MAX_CACHED_MARKETS = 500;

  const fetchMarketsFromOverpass = useCallback(async (region: any) => {
    if (region.latitudeDelta > 0.045 || region.longitudeDelta > 0.045) {
      console.log("Zoomed out too far, skipping fetch.");
      return;
    }

    const cachedData = mapCacheManager.getStoresForRegion(region);

    if (cachedData) {
      console.log("Cache hit for region:", mapCacheManager.getRegionKey(region));
      
      const prev = useLocationStore.getState().cachedMarkets || [];
      const combined = [...prev, ...cachedData];
      const unique = combined.filter(
        (market, index, self) => index === self.findIndex((m) => m.id === market.id)
      );
      
      let finalMarkets = unique;
      if (unique.length > MAX_CACHED_MARKETS) {
        finalMarkets = unique.slice(unique.length - MAX_CACHED_MARKETS);
      }
      if (finalMarkets.length !== prev.length) {
        setCachedMarkets(finalMarkets);
      }
      return;
    }

    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    const controller = new AbortController();
    fetchAbortController.current = controller;

    try {
      setIsFetchingMarkets(true);
      const minDelta = 0.01;
      const latDelta = Math.max(region.latitudeDelta, minDelta);
      const lonDelta = Math.max(region.longitudeDelta, minDelta);

      const fetchSouth = region.latitude - latDelta / 2;
      const fetchWest = region.longitude - lonDelta / 2;
      const fetchNorth = region.latitude + latDelta / 2;
      const fetchEast = region.longitude + lonDelta / 2;

      const fetchedMarkets = await fetchMarkets(fetchSouth, fetchWest, fetchNorth, fetchEast, controller.signal);

      mapCacheManager.setStoresForRegion(region, fetchedMarkets);

      const prev = useLocationStore.getState().cachedMarkets || [];
      const combined = [...prev, ...fetchedMarkets];
      const unique = combined.filter(
        (market, index, self) => index === self.findIndex((m) => m.id === market.id)
      );
      
      let finalMarkets = unique;
      if (unique.length > MAX_CACHED_MARKETS) {
        finalMarkets = unique.slice(unique.length - MAX_CACHED_MARKETS);
      }
      setCachedMarkets(finalMarkets);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
        console.log('Error fetching from Overpass:', error);
      }
    } finally {
      setIsFetchingMarkets(false);
    }
  }, []);

  // Keep the stable ref in sync with the latest fetchMarketsFromOverpass
  useEffect(() => {
    fetchMarketsRef.current = fetchMarketsFromOverpass;
  }, [fetchMarketsFromOverpass]);

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

  const handleRegionChangeComplete = useCallback((region: any) => {
    // Debounce to prevent cluster engine thrashing during animateToRegion
    if (regionDebounceRef.current) {
      clearTimeout(regionDebounceRef.current);
    }
    regionDebounceRef.current = setTimeout(() => {
      setCurrentRegion(region);
      if (!isAnimatingRef.current) {
        updateClusters(region);
      }
      isAnimatingRef.current = false;
    }, isAnimatingRef.current ? 200 : 50);

    // Add a 1 second debounce specifically for fetching from Overpass API
    // so we don't exhaust the service when the user drags repeatedly
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      fetchMarketsRef.current(region);
    }, 1000);
  }, [updateClusters]);

  const points = useMemo(() => {
    const allPoints: PointFeature<any>[] = [];
    
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

  useEffect(() => {
    superclusterRef.current.load(points);
    updateClusters(currentRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]); // Deliberately omitting currentRegion to prevent reloading the entire KD-tree on every pan

  // Handle programmatic selection via params (e.g. from Home page)
  useEffect(() => {
    if (params.shopId && mapRef.current) {
      const shopToSelect = savedShops.find(s => s.id === params.shopId || `saved-${s.id}` === params.shopId);
      if (shopToSelect) {
        const targetShopId = `saved-${shopToSelect.id}`;
        
        // Don't re-select if already selected
        if (selectedShopToSave?.id === targetShopId) return;

        setSelectedShopToSave({ ...shopToSelect, id: targetShopId, isSaved: true });
        isAnimatingRef.current = true;
        
        const latDelta = currentRegion?.latitudeDelta || 0.015;
        const lonDelta = currentRegion?.longitudeDelta || 0.015;
        const adjustedLatitude = shopToSelect.latitude - (latDelta * 0.25);
        
        mapRef.current.animateToRegion({
          latitude: adjustedLatitude,
          longitude: shopToSelect.longitude,
          latitudeDelta: latDelta,
          longitudeDelta: lonDelta}, 500);

        if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
        calloutTimerRef.current = setTimeout(() => {
          setReadyCalloutId(targetShopId);
        }, 300);

        if (bottomSheetRef.current) {
           bottomSheetRef.current.snapToIndex(1);
        }
        // Scroll content to top so the preview is fully visible
        bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  }, [params.shopId, savedShops.length]);

  // Handle tracksViewChanges and hiding callouts when selection changes
  useEffect(() => {
    if (selectedShopToSave) {
      const markerId = selectedShopToSave.id;

      // Enable tracksViewChanges for the selected marker so its callout can render and stay visible
      setTracksViewId(markerId);
    } else {
      setReadyCalloutId(null);
      // Hide all callouts when deselected
      Object.values(markerRefs.current).forEach((marker) => {
        if (marker && typeof marker.hideCallout === 'function') {
          marker.hideCallout();
        }
      });
    }
  }, [selectedShopToSave]);

  // Force reset scroll position + bottom sheet snap whenever selected shop changes
  useEffect(() => {
    if (selectedShopToSave) {
      // Reset scroll to top immediately (no animation to avoid visual jump)
      bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: false });
      // Expand to medium snap point so preview + shops title + first card are visible
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [selectedShopToSave]);

  // Programmatically show the callout only after it has mounted
  useEffect(() => {
    if (readyCalloutId) {
      const markerRef = markerRefs.current[readyCalloutId];
      if (markerRef && typeof markerRef.showCallout === 'function') {
        // Small delay to ensure the native view has mounted before showing
        setTimeout(() => markerRef.showCallout(), 50);
      }
    }
  }, [readyCalloutId]);

  const handleLocateMe = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    }

    const fallbackRegion = {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015};

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (isInitial) {
          setInitialRegion(fallbackRegion);
          setCurrentRegion(fallbackRegion);
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const latitudeDelta = 0.015;
      const longitudeDelta = 0.015;
      const actualLatitude = location.coords.latitude;
      const actualLongitude = location.coords.longitude;
      
      setUserLocation({ latitude: actualLatitude, longitude: actualLongitude });

      // Calculate adjusted latitude to shift visual center above bottom sheet
      const adjustedLatitude = actualLatitude - (latitudeDelta * 0.25);

      const newRegion = {
        latitude: adjustedLatitude,
        longitude: actualLongitude,
        latitudeDelta,
        longitudeDelta};

      if (isInitial) {
        setInitialRegion(newRegion);
        setCurrentRegion(newRegion);
      } else {
        mapRef.current?.animateToRegion(newRegion, 1000);
        setCurrentRegion(newRegion);
      }
      updateClusters(newRegion);

      // Fetch markets around actual location (via ref for latest version)
      fetchMarketsRef.current({
        latitude: actualLatitude,
        longitude: actualLongitude,
        latitudeDelta,
        longitudeDelta
      });
    } catch (error) {
      console.warn('Error fetching location', error);
      if (isInitial) {
        setInitialRegion(fallbackRegion);
        setCurrentRegion(fallbackRegion);
      }
    }
  }, [updateClusters]);

  // Stable ref so the mount effect always calls the latest handleLocateMe
  const handleLocateMeRef = useRef(handleLocateMe);
  useEffect(() => { handleLocateMeRef.current = handleLocateMe; }, [handleLocateMe]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const locate = () => {
      if (useLocationStore.persist?.hasHydrated()) {
        handleLocateMeRef.current(true);
      } else {
        timeout = setTimeout(locate, 50);
      }
    };
    locate();
    return () => clearTimeout(timeout);
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
      <View style={{ width: 88, height: '100%' }}>
        <BottomSheetTouchableOpacity
          activeOpacity={0.7}
          style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 20 }}
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            setDeleteModalData({
              title: 'Delete Shop?',
              description: 'You will stop receiving notifications for this shop. This action cannot be undone.',
              isDestructive: true,
              confirmLabel: 'Delete',
              onConfirm: () => {
                removeLocation(locId);
                swipeableRefs.current.delete(locId);
                swipeableRefs.current.delete('context-' + locId);
                if (selectedShopToSave && (selectedShopToSave.id === locId || selectedShopToSave.id === `saved-${locId}`)) {
                  setSelectedShopToSave(null);
                }
                setDeleteModalVisible(false);
              },
              onCancel: () => {
                swipeableRefs.current.get(locId)?.close();
              }
            });
            setDeleteModalVisible(true);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
        </BottomSheetTouchableOpacity>
      </View>
    );
  };

  return (
    <AnimatedScreen>
    <View style={styles.container}>
      <StatusBar style="dark" />
      <MapSearchIndicator isVisible={isFetchingMarkets} />

      {/* Full Screen Background Map
       * ── iOS Stability & Performance Optimizations ──
       * pitchEnabled={false}    → Locks map to flat 2D view; prevents 3D tilt that
       *                           causes GPU spikes and react-native-maps crashes on iOS.
       * rotateEnabled={false}   → Disables rotation gestures; avoids disorienting the
       *                           user and keeps clustering/bbox math stable.
       * showsBuildings={false}  → Turns off 3D building extrusions to reduce GPU/memory
       *                           pressure on dense urban areas.
       * showsIndoors={false}    → Disables indoor floor-plan rendering to avoid extra
       *                           map tiles and memory overhead.
       * showsCompass={false}    → Hides the compass widget since rotation is disabled;
       *                           keeps the UI clean like delivery/store-style apps.
       * showsUserLocation={true} → Retained: essential for store proximity UX.
       */}
      {initialRegion ? (
      <MapView
        ref={mapRef}
        userInterfaceStyle="light"
        style={StyleSheet.absoluteFillObject}
        mapPadding={{ top: insets.top, right: 0, bottom: 210, left: 0 }}
        initialRegion={initialRegion}
        showsUserLocation={true}
        followsUserLocation={false}
        showsPointsOfInterest={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsBuildings={false}
        showsIndoors={false}
        showsCompass={false}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={() => {
          setSelectedShopToSave(null);
          Keyboard.dismiss();
          closeAllSwipeables();
          // 1. Avoid firing requests during continuous panning
          if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
            fetchDebounceRef.current = null;
          }
        }}
        onPress={(e) => {
          Keyboard.dismiss();
          closeAllSwipeables();
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedShopToSave(null);
          }
        }}
      >
        {savedShops.map((shop) => {
          const isSaved = true;
          const shopId = `saved-${shop.id}`;
          const isSelected = selectedShopToSave?.id === shopId;
          let markerName = shop.name || 'Store';
          if (markerName) markerName = markerName.replace(/7[\s-]*eleven/ig, '7\u2011Eleven');
          const needsTracking = tracksViewId === shopId;
          const longitude = shop.longitude;
          const latitude = shop.latitude;

          return (
            <TrackedMarker
              key={shopId}
              ref={(ref: any) => {
                if (ref) markerRefs.current[shopId] = ref;
              }}
              coordinate={{ latitude, longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              calloutAnchor={{ x: 0.5, y: 0.15 }}
              forceTrack={needsTracking}
              onPress={(e: any) => {
                e.stopPropagation();
                Keyboard.dismiss();
                const now = Date.now();
                if (now - lastTap.current < 400) return; // Increased from 300 to cover animation duration
                lastTap.current = now;
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                
                // Cancel any in-flight callout timer from a previous rapid tap
                if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
                setReadyCalloutId(null); // Hide any existing callout
                setSelectedShopToSave({ ...shop, id: shopId, isSaved: true });

                isAnimatingRef.current = true;
                // Keep the current zoom level if known, otherwise default to 0.01
                const latDelta = currentRegion?.latitudeDelta || 0.01;
                const lonDelta = currentRegion?.longitudeDelta || 0.01;
                // Offset latitude so the marker isn't hidden under the bottom sheet
                const adjustedLatitude = latitude - (latDelta * 0.25);
                
                mapRef.current?.animateToRegion({
                  latitude: adjustedLatitude,
                  longitude,
                  latitudeDelta: latDelta,
                  longitudeDelta: lonDelta}, 350);

                // Mount the callout immediately to sync with marker animation
                calloutTimerRef.current = setTimeout(() => {
                  setReadyCalloutId(shopId);
                }, 10);

                // Expand the bottom sheet to medium snap point to show the context card
                if (bottomSheetRef.current) {
                   bottomSheetRef.current.snapToIndex(1);
                }
                // Scroll content to top so the preview is fully visible
                bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <StoreMarker isSaved={isSaved} isSelected={isSelected} isMuted={!shop.isActive} />
              {readyCalloutId === shopId && (
                <Callout tooltip onPress={() => {}}>
                  <View style={styles.calloutContainer} pointerEvents="none">
                    <View style={[styles.calloutBubble, isSaved ? styles.calloutBubbleSaved : styles.calloutBubbleUnsaved]}>
                      <Text style={[styles.calloutText, isSaved ? styles.calloutTextSaved : styles.calloutTextUnsaved]} numberOfLines={3}>{markerName}</Text>
                    </View>
                    <View style={[styles.calloutArrow, isSaved ? styles.calloutArrowSaved : styles.calloutArrowUnsaved]} />
                  </View>
                </Callout>
              )}
            </TrackedMarker>
          );
        })}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;
          const clusterId = cluster.id;

          if (isCluster) {
            return (
              <TrackedMarker
                key={`cluster-${clusterId}`}
                coordinate={{ latitude, longitude }}
                forceTrack={false}
                onPress={(e: any) => {
                  e.stopPropagation();
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  Keyboard.dismiss();
                  isAnimatingRef.current = true;
                  
                  const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId);
                  const longitudeDelta = 360 / Math.pow(2, zoom);
                  const latitudeDelta = longitudeDelta * (SCREEN_HEIGHT / Dimensions.get('window').width);
                  
                  mapRef.current?.animateToRegion({
                    latitude,
                    longitude,
                    latitudeDelta,
                    longitudeDelta}, 350);
                }}
              >
                <MapCluster pointCount={pointCount} onPress={() => {}} />
              </TrackedMarker>
            );
          }

          // Not a cluster, it's an individual marker
          const properties = cluster.properties;
          if (!properties?.id) return null; // Guard against corrupted cluster data
          const isSaved = properties.isSaved;
          const isSelected = selectedShopToSave?.id === properties.id || (isSaved && selectedShopToSave?.id === `saved-${properties.id}`);
          let markerName = properties.name || 'Store';
          if (markerName) markerName = markerName.replace(/7[\s-]*eleven/ig, '7\u2011Eleven');
          const needsTracking = tracksViewId === properties.id;

          return (
            <TrackedMarker
              key={properties.id}
              ref={(ref: any) => {
                if (ref) markerRefs.current[properties.id] = ref;
              }}
              coordinate={{ latitude, longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              calloutAnchor={{ x: 0.5, y: 0.15 }}
              forceTrack={needsTracking}
              onPress={(e: any) => {
                e.stopPropagation();
                Keyboard.dismiss();
                const now = Date.now();
                if (now - lastTap.current < 400) return; // Increased from 300 to cover animation duration
                lastTap.current = now;
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                
                // Cancel any in-flight callout timer from a previous rapid tap
                if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
                setReadyCalloutId(null); // Hide any existing callout
                setSelectedShopToSave(properties);

                // Reverse-geocode the address in the background
                if (!properties.address) {
                  reverseGeocodeAddress(properties.latitude ?? latitude, properties.longitude ?? longitude).then((addr) => {
                    const current = useLocalUIStore.getState().selectedShopToSave;
                    if (current && current.id === properties.id) {
                      useLocalUIStore.getState().setSelectedShopToSave({ ...current, address: addr || 'Unknown Address' });
                    }
                  });
                }

                isAnimatingRef.current = true;
                // Keep the current zoom level if known, otherwise default to 0.01
                const latDelta = currentRegion?.latitudeDelta || 0.01;
                const lonDelta = currentRegion?.longitudeDelta || 0.01;
                // Offset latitude so the marker isn't hidden under the bottom sheet
                const adjustedLatitude = latitude - (latDelta * 0.25);
                
                mapRef.current?.animateToRegion({
                  latitude: adjustedLatitude,
                  longitude,
                  latitudeDelta: latDelta,
                  longitudeDelta: lonDelta}, 350);

                // Mount the callout immediately to sync with marker animation
                calloutTimerRef.current = setTimeout(() => {
                  setReadyCalloutId(properties.id);
                }, 10);

                // Expand the bottom sheet to medium snap point to show the context card
                if (bottomSheetRef.current) {
                   bottomSheetRef.current.snapToIndex(1);
                }
                // Scroll content to top so the preview is fully visible
                bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <StoreMarker isSaved={isSaved} isSelected={isSelected} isMuted={mutedUnsavedShops.includes(properties.id)} />
              {readyCalloutId === properties.id && (
                <Callout tooltip onPress={() => {}}>
                  <View style={styles.calloutContainer} pointerEvents="none">
                    <View style={[styles.calloutBubble, isSaved ? styles.calloutBubbleSaved : styles.calloutBubbleUnsaved]}>
                      <Text style={[styles.calloutText, isSaved ? styles.calloutTextSaved : styles.calloutTextUnsaved]} numberOfLines={3}>{markerName}</Text>
                    </View>
                    <View style={[styles.calloutArrow, isSaved ? styles.calloutArrowSaved : styles.calloutArrowUnsaved]} />
                  </View>
                </Callout>
              )}
            </TrackedMarker>
          );
        })}
      </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f8fafc' }]} />
      )}



      {/* ── Settings Wheel Button ── */}
      <Animated.View
        style={[
          styles.floatingSettingsBtn,
          { top: Math.max(20, insets.top) },
          settingsAnimatedStyle,
        ]}
        pointerEvents={isSearchFocused ? 'none' : 'auto'}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/notification-preferences')}
          style={styles.floatingSettingsInner}
        >
          <Settings size={20} color="#475569" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>



      {/* Locate Me Button */}
      <Animated.View style={[styles.locateButtonContainer, animatedLocateStyle]}>
        <View style={styles.locateButtonSurface}>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={() => handleLocateMe()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#334155" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Draggable Bottom Sheet */}
      <Animated.View style={[{ flex: 1, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 }, bottomSheetPushStyle]} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 18,
          elevation: 12,
        }}
        animatedPosition={animatedPosition}
        snapPoints={snapPoints}
        topInset={SCREEN_HEIGHT * 0.3}
        animateOnMount={true}
        enableOverDrag={true}
        overDragResistanceFactor={15}
        animationConfigs={{
          damping: 70,
          stiffness: 300,
          mass: 1,
          overshootClamping: true,
          restDisplacementThreshold: 0.1,
          restSpeedThreshold: 0.1,
        }}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        handleStyle={{ paddingBottom: 4, paddingTop: 12 }}
        backgroundStyle={{
          borderRadius: 32,
          backgroundColor: '#F2F2F7'
        }}
      >

        <BottomSheetScrollView
          ref={bottomSheetScrollRef}
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            closeAllSwipeables();
          }}
        >
          {/* Header Content moved from CustomHandle */}
          <Animated.View layout={LinearTransition.springify()} className="w-full pt-3 pb-2">
            {selectedShopToSave && !selectedShopToSave.isSaved && (
              <>
                <Animated.View
                  entering={FadeInDown.duration(300).springify()}
                  exiting={FadeOutUp.duration(200)}
                  layout={LinearTransition.springify()}
                  style={{ marginBottom: 14 }}
                >
                  <View
                    className="bg-white rounded-[22px] flex-row items-center justify-between"
                    style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={16} color="#475569" />
                      </View>
                      <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{selectedShopToSave.name}</Text>
                          {userLocation && (
                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                              <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b' }}>{formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, selectedShopToSave.latitude, selectedShopToSave.longitude))}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '400', color: '#64748b', marginTop: 2 }} numberOfLines={1}>{selectedShopToSave.address || 'Finding address...'}</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
                <Animated.View
                  entering={FadeInDown.duration(300).springify().delay(50)}
                  exiting={FadeOutUp.duration(200)}
                  style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}
                >
                  <TouchableOpacity
                    style={[styles.contextDirectionsBtn, { paddingHorizontal: 0, width: 52 }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      const isMuted = mutedUnsavedShops.includes(selectedShopToSave.id);
                      const muteOption = isMuted ? 'Unmute Notifications' : 'Mute Notifications';
                      const options = ['Cancel', muteOption, 'View Store Details'];
                      const cancelButtonIndex = 0;
                      ActionSheetIOS.showActionSheetWithOptions(
                        {
                          options,
                          cancelButtonIndex,
                        },
                        (index: number) => {
                          if (index === 1) {
                            if (!isMuted && !canMuteShop(isPro)) {
                              Alert.alert(
                                'Mute Limit Reached',
                                `You've reached the free limit of ${FREE_TIER.maxMutedShops} muted shops. Upgrade to Pro for unlimited muted shops.`,
                                [
                                  { text: 'OK', style: 'cancel' },
                                  {
                                    text: 'Upgrade to Pro',
                                    onPress: () => router.push('/paywall'),
                                  },
                                ]
                              );
                              return;
                            }
                            toggleMuteUnsavedShop(selectedShopToSave.id);
                            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                          } else if (index === 2) {
                            Alert.alert('Store Details', 'Coming soon');
                          }
                        }
                      );
                    }}
                  >
                    <MoreHorizontal size={20} color="#0f172a" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contextDirectionsBtn, { flex: 1 }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      openDirectionsSheet(selectedShopToSave.latitude, selectedShopToSave.longitude);
                    }}
                  >
                    <Navigation2 size={18} color="#0f172a" />
                    <Text style={styles.contextDirectionsBtnText} numberOfLines={1}>Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contextSaveBtn, { flex: 1, marginBottom: 0 }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      if (!canAddLocation(isPro)) {
                        const maxStores = getMaxSavedStores(isPro);
                        Alert.alert(
                          'Store Limit Reached',
                          isPro
                            ? `You've reached the maximum of ${maxStores} saved stores (iOS geofence limit).`
                            : `You've reached the free limit of ${FREE_TIER.maxSavedStores} saved stores. Upgrade to Pro for up to 20 saved stores.`,
                          isPro
                            ? [{ text: 'OK' }]
                            : [
                                { text: 'OK', style: 'cancel' },
                                {
                                  text: 'Upgrade to Pro',
                                  onPress: () => router.push('/paywall'),
                                },
                              ]
                        );
                        return;
                      }
                      addLocation({
                        name: selectedShopToSave.name || 'Unknown Store',
                        address: selectedShopToSave.address || 'Unknown Address',
                        latitude: selectedShopToSave.latitude,
                        longitude: selectedShopToSave.longitude,
                        radius: 500});
                      setSelectedShopToSave(null);
                    }}
                  >
                    <Plus size={24} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
            {selectedShopToSave && selectedShopToSave.isSaved && (() => {
              const loc = savedShops.find(s => `saved-${s.id}` === selectedShopToSave.id);
              if (!loc) return null;
              const originalId = loc.id;
              return (
              <>
              <Animated.View
                entering={FadeInDown.duration(300).springify()}
                exiting={FadeOutUp.duration(200)}
                layout={LinearTransition.springify()}
                style={{ marginBottom: 14 }}
              >
                <Swipeable
                  ref={(ref) => {
                    if (ref) {
                      swipeableRefs.current.set('context-' + originalId, ref);
                    } else {
                      swipeableRefs.current.delete('context-' + originalId);
                    }
                  }}
                  renderRightActions={() => renderRightActions(originalId)}
                  rightThreshold={40}
                  overshootRight={false}
                  friction={2}
                  onSwipeableWillOpen={() => closeAllSwipeables('context-' + originalId)}
                >
                  <TouchableOpacity
                    className="bg-white rounded-[22px] flex-row items-center justify-between"
                    style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      closeAllSwipeables();
                      setSelectedShopToSave(null);
                    }}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={16} color="#475569" />
                      </View>
                      <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{loc.name}</Text>
                          {userLocation && (
                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                              <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b' }}>{formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, loc.latitude, loc.longitude))}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '400', color: '#64748b', marginTop: 2 }} numberOfLines={1}>{loc.address || 'Saved Shop'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.5}
                      onPress={(e) => {
                        e.stopPropagation();
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                        const isMuted = !loc.isActive;
                        const muteOption = isMuted ? 'Unmute Notifications' : 'Mute Notifications';
                        const options = ['Cancel', muteOption, 'View Store Details'];
                        const cancelButtonIndex = 0;
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options,
                            cancelButtonIndex,
                          },
                          (index: number) => {
                            if (index === 1) {
                              if (!isMuted && !canMuteShop(isPro)) {
                                Alert.alert(
                                  'Mute Limit Reached',
                                  `You've reached the free limit of ${FREE_TIER.maxMutedShops} muted shops. Upgrade to Pro for unlimited muted shops.`,
                                  [
                                    { text: 'OK', style: 'cancel' },
                                    {
                                      text: 'Upgrade to Pro',
                                      onPress: () => router.push('/paywall'),
                                    },
                                  ]
                                );
                                return;
                              }
                              useLocationStore.getState().toggleActive(originalId);
                              hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                            } else if (index === 2) {
                              Alert.alert('Store Details', 'Coming soon');
                            }
                          }
                        );
                      }}
                    >
                      <MoreHorizontal size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Swipeable>
              </Animated.View>
              <Animated.View
                entering={FadeInDown.duration(300).springify().delay(50)}
                exiting={FadeOutUp.duration(200)}
                style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}
              >
                <TouchableOpacity
                  style={[styles.contextDirectionsBtn, { paddingHorizontal: 0, width: 52 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    const isMuted = !loc.isActive;
                    const muteOption = isMuted ? 'Unmute Notifications' : 'Mute Notifications';
                    const options = ['Cancel', muteOption, 'View Store Details'];
                    const cancelButtonIndex = 0;
                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        options,
                        cancelButtonIndex,
                      },
                      (index: number) => {
                        if (index === 1) {
                          if (!isMuted && !canMuteShop(isPro)) {
                            Alert.alert(
                              'Mute Limit Reached',
                              `You've reached the free limit of ${FREE_TIER.maxMutedShops} muted shops. Upgrade to Pro for unlimited muted shops.`,
                              [
                                { text: 'OK', style: 'cancel' },
                                {
                                  text: 'Upgrade to Pro',
                                  onPress: () => router.push('/paywall'),
                                },
                              ]
                            );
                            return;
                          }
                          useLocationStore.getState().toggleActive(originalId);
                          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                        } else if (index === 2) {
                          Alert.alert('Store Details', 'Coming soon');
                        }
                      }
                    );
                  }}
                >
                  <MoreHorizontal size={20} color="#0f172a" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contextDirectionsBtn, { flex: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    openDirectionsSheet(loc.latitude, loc.longitude);
                  }}
                >
                  <Navigation2 size={18} color="#0f172a" />
                  <Text style={styles.contextDirectionsBtnText} numberOfLines={1}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contextSaveBtn, { flex: 1, marginBottom: 0, backgroundColor: '#F2726F' }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    removeLocation(originalId);
                    swipeableRefs.current.delete(originalId);
                    swipeableRefs.current.delete('context-' + originalId);
                    setSelectedShopToSave(null);
                  }}
                >
                  <Trash2 size={18} color="#fff" />
                  <Text style={styles.contextSaveBtnText}>Remove</Text>
                </TouchableOpacity>
              </Animated.View>
              </>
              );
            })()}

            <Animated.View 
              entering={FadeInDown.duration(400).springify()}
              layout={LinearTransition.springify()} 
              style={{ marginTop: 0, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>Saved Shops</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748b', letterSpacing: -0.1 }}>
                {activeSavedShops.length === 0 ? 'No shops' : `${activeSavedShops.length} ${activeSavedShops.length === 1 ? 'shop' : 'shops'}`}
              </Text>
            </Animated.View>
          </Animated.View>
          {/* Empty state */}
          {activeSavedShops.length === 0 && (
            <Animated.View 
              entering={FadeInDown.duration(400).delay(100).springify()}
              style={styles.emptyState}
            >
              <View style={styles.emptyIcon}>
                <Store size={26} color="#475569" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No saved shops yet</Text>
              <Text style={styles.emptySub}>Tap a shop marker to save it</Text>
            </Animated.View>
          )}

          {/* Saved shop cards with swipe-to-delete */}
          {(() => {
            const mutedUnsavedMarkets = markets
              .filter(m => mutedUnsavedShops.includes(m.id))
              .map(m => ({ ...m, isActive: false, isUnsaved: true }));

            const allMutedShops = [...mutedSavedShops, ...mutedUnsavedMarkets];

            const renderShopCard = (loc: any, index: number) => {
              if (selectedShopToSave && selectedShopToSave.isSaved && selectedShopToSave.id === `saved-${loc.id}`) {
                return null;
              }
              return (
              <Animated.View
                key={loc.id}
                entering={FadeInDown.duration(400).delay(index * 60).springify()}
                layout={LinearTransition.springify()}
                exiting={FadeOutLeft.duration(200)}
              >
                <Swipeable
                  containerStyle={{ marginBottom: 10 }}
                  ref={(ref) => {
                    if (ref) {
                      swipeableRefs.current.set(loc.id, ref);
                    } else {
                      swipeableRefs.current.delete(loc.id);
                    }
                  }}
                  renderRightActions={loc.isUnsaved ? undefined : () => renderRightActions(loc.id)}
                  rightThreshold={40}
                  overshootRight={false}
                  friction={2}
                  onSwipeableWillOpen={() => closeAllSwipeables(loc.id)}
                >
                  <TouchableOpacity
                    className="bg-white rounded-[22px] flex-row items-center justify-between"
                    style={{ paddingVertical: 10, paddingHorizontal: 14 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      closeAllSwipeables();
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      Keyboard.dismiss();
                      isAnimatingRef.current = true;
                      const latitudeDelta = 0.01;
                      const longitudeDelta = 0.01;
                      const adjustedLatitude = loc.latitude - (latitudeDelta * 0.25);
                      const region = {
                        latitude: adjustedLatitude,
                        longitude: loc.longitude,
                        latitudeDelta,
                        longitudeDelta};
                      mapRef.current?.animateToRegion(region, 500);
                      bottomSheetRef.current?.snapToIndex(1);
                      // Scroll content to top so the preview is fully visible
                      bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: true });

                      // Select this shop and show its callout after animation settles
                      const savedId = loc.isUnsaved ? loc.id : `saved-${loc.id}`;
                      setReadyCalloutId(null);
                      setSelectedShopToSave({ ...loc, id: savedId, isSaved: !loc.isUnsaved });
                      setTimeout(() => {
                        setReadyCalloutId(savedId);
                      }, 550);
                    }}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                        {loc.isActive === false ? (
                          <BellOff size={16} color="#94a3b8" />
                        ) : (
                          <Store size={16} color="#475569" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: loc.isActive === false ? '#64748b' : '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{loc.name}</Text>
                          {userLocation && (
                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                              <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b' }}>{formatDistance(haversineDistance(userLocation.latitude, userLocation.longitude, loc.latitude, loc.longitude))}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '400', color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>{loc.address || 'Saved Shop'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.5}
                      onPress={(e) => {
                        e.stopPropagation();
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                        const isMuted = !loc.isActive;
                        const muteOption = isMuted ? 'Unmute Notifications' : 'Mute Notifications';
                        const options = ['Cancel', muteOption, 'View Store Details'];
                        const cancelButtonIndex = 0;
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options,
                            cancelButtonIndex,
                          },
                          (index: number) => {
                            if (index === 1) {
                              if (!isMuted && !canMuteShop(isPro)) {
                                Alert.alert(
                                  'Mute Limit Reached',
                                  `You've reached the free limit of ${FREE_TIER.maxMutedShops} muted shops. Upgrade to Pro for unlimited muted shops.`,
                                  [
                                    { text: 'OK', style: 'cancel' },
                                    {
                                      text: 'Upgrade to Pro',
                                      onPress: () => router.push('/paywall'),
                                    },
                                  ]
                                );
                                return;
                              }
                              if (loc.isUnsaved) {
                                toggleMuteUnsavedShop(loc.id);
                              } else {
                                useLocationStore.getState().toggleActive(loc.id);
                              }
                              hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                            } else if (index === 2) {
                              Alert.alert('Store Details', 'Coming soon');
                            }
                          }
                        );
                      }}
                    >
                      <MoreHorizontal size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Swipeable>
              </Animated.View>
              );
            };

            return (
              <>
                {activeSavedShops.map((loc, index) => renderShopCard(loc, index))}

                {allMutedShops.length > 0 && (
                  <Animated.View 
                    entering={FadeInDown.duration(400).springify()}
                    layout={LinearTransition.springify()} 
                    style={{ marginTop: 24, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '600', letterSpacing: -0.6, color: '#64748b' }}>Muted Shops</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#94a3b8', letterSpacing: -0.1 }}>
                      {allMutedShops.length} {allMutedShops.length === 1 ? 'shop' : 'shops'}
                    </Text>
                  </Animated.View>
                )}
                {allMutedShops.map((loc, index) => renderShopCard(loc, index + activeSavedShops.length))}
              </>
            );
          })()}

          {/* Hint/Placeholder Text — shown when fewer than 3 shops saved overall */}
          {savedShops.length > 0 && savedShops.length < 3 && (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#BDBDBD' }}>Tap a map marker to add more shops</Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      </Animated.View>

      <ConfirmationSheet
        visible={deleteModalVisible}
        data={deleteModalData}
        onDismiss={() => setDeleteModalVisible(false)}
      />
    </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'},
  floatingSearchBtn: {
    position: 'absolute',
    right: 74,
    zIndex: 15,
    backgroundColor: '#ffffff',
    overflow: 'hidden'},
  floatingSettingsBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 14,
    backgroundColor: '#ffffff',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(241,245,249,0.8)'},
  floatingSettingsInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'},
  floatingSearchInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12},
  floatingSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#0f172a',
    height: '100%',
    letterSpacing: -0.2},
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'},
  locateButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 16,
    zIndex: 10},
  locateButtonSurface: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff'},
  locateButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'},

  /* ── Map marker ────────────────────────── */
  markerPill: {
    backgroundColor: '#ffffff',
    padding: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0'},
  markerPillSaved: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a'},

  /* ── Empty state ───────────────────────── */
  emptyState: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 100,
    paddingHorizontal: 20},
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'},
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 4},
  emptySub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20},

  /* ── Saved shop card extras ────────────── */
  shopIcon: {
    backgroundColor: '#f8fafc',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9'},

  /* ── Swipe-to-delete action ────────────── */
  swipeDeleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 14},
  swipeDeleteInner: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    height: '100%',
    borderRadius: 20,
    marginLeft: 8,
    gap: 4},
  swipeDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3},

  /* ── Hint / Placeholder Card ─────────── */
  hintCard: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    marginTop: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center'},
  hintText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#BDBDBD',
    marginTop: 10},

  /* ── Context save button ───────────────── */
  contextSaveBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8},
  contextSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'},
  contextDirectionsBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'},
  contextDirectionsBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700'},

  /* ── Marker Callout Tooltip ──────────── */
  calloutContainer: {
    alignItems: 'center',
    minWidth: 120,
    maxWidth: 260},
  calloutBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14},
  calloutBubbleUnsaved: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0'},
  calloutBubbleSaved: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0f172a'},
  calloutText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center'},
  calloutTextUnsaved: {
    color: '#0f172a'},
  calloutTextSaved: {
    color: '#0f172a'},
  calloutArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1},
  calloutArrowUnsaved: {
    borderTopColor: '#ffffff',
    marginTop: -2},
  calloutArrowSaved: {
    borderTopColor: '#0f172a',
    marginTop: -2}});
