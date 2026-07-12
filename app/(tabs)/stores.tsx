import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Keyboard, Linking, ActionSheetIOS, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, Trash2, Navigation2, MoreHorizontal, BellOff, Settings } from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MapView, { Marker } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView, TouchableOpacity as BottomSheetTouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, FadeInDown, FadeOutUp, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import Supercluster, { PointFeature } from 'supercluster';
import { fetchMarkets, isOfflineError } from '../../services/overpassService';
import { mapCacheManager, regionToBBox, bboxCoverageRatio, COVERAGE_HIT_RATIO, StoreBBox } from '../../services';
import { useLocationStore, useSettingsStore } from '../../store';
import AnimatedScreen from '../../components/AnimatedScreen';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../../services/haptics';
import MapCluster from '../../components/MapCluster';
import StoreMarker from '../../components/StoreMarker';
import { MapSearchIndicator } from '../../components/MapSearchIndicator';
import { create } from 'zustand';
import { Alert } from 'react-native';
import { FREE_TIER, getMaxSavedStores, NOTIFICATION_CONSTANTS } from '@/constants';
import ConfirmationSheet from '../../components/ConfirmationSheet';
import { showPaywall } from "@/services/paywallService";

interface LocalUIState {
  selectedShopToSave: any | null;
  setSelectedShopToSave: (shop: any | null) => void;
  isZoomHintVisible: boolean;
  setZoomHintVisible: (visible: boolean) => void;
  isTooFarHintVisible: boolean;
  setTooFarHintVisible: (visible: boolean) => void;
  isManualAddMode: boolean;
  setManualAddMode: (active: boolean) => void;
}
const useLocalUIStore = create<LocalUIState>((set) => ({
  selectedShopToSave: null,
  setSelectedShopToSave: (shop) => set({ selectedShopToSave: shop }),
  isZoomHintVisible: false,
  setZoomHintVisible: (visible) => set({ isZoomHintVisible: visible }),
  isTooFarHintVisible: false,
  setTooFarHintVisible: (visible) => set({ isTooFarHintVisible: visible }),
  isManualAddMode: false,
  setManualAddMode: (active) => set({ isManualAddMode: active })
}));



const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MARKER_ANCHOR = { x: 0.5, y: 0.5 };
const MAX_CACHED_MARKETS = NOTIFICATION_CONSTANTS.MARKET_WORKING_SET_CAP;
// Beyond this delta the viewport is too wide for a store-level Overpass query;
// the fetch is skipped and the "zoom in" hint may be shown instead.
const MAX_FETCH_DELTA = 0.07;
// Discovery is anchored to where the user actually is: viewports centered
// farther than this from their location are intentionally not fetched, and
// the pill shows a "too far" hint instead of the spinner. Same length as the
// zoom gate above (MAX_FETCH_DELTA ≈ 7.8 km of latitude), so panning more
// than one max-zoom viewport away from yourself ends discovery; panning back
// in range resumes normal fetching.
const MAX_FETCH_DISTANCE_M = MAX_FETCH_DELTA * 111_320; // ≈ 7.8 km
// In-flight Overpass requests are no longer aborted on pan (their results are
// always cached), but cap how many can run at once during rapid exploration.
const MAX_CONCURRENT_FETCHES = 3;
// A legitimate fetch settles within ~75s (3 mirrors x 25s timeout). Anything
// older is a leaked entry (e.g. an abort that was never honored) — purge it so
// the in-flight coverage check can never suppress a viewport forever.
const STALE_FETCH_MS = 90_000;
// After a failed fetch, retry the current viewport automatically so temporary
// network failures self-heal without requiring a pan. Backoff doubles up to
// the cap while failures continue; any success resets it. The cap stays low
// (probes cost nothing while offline) so reconnecting is noticed quickly.
const FETCH_RETRY_BASE_MS = 15_000;
const FETCH_RETRY_MAX_MS = 60_000;

// When the market list exceeds the cap, keep the markets closest to the
// current viewport center rather than the newest-inserted — trimming by
// insertion age blanked previously visited areas and could even drop stores
// inside the viewport the user is looking at after one dense fetch.
// Preserves the original array order so an unchanged survivor set doesn't
// shuffle the Supercluster point signature.
const trimMarketsByDistance = (
  markets: any[],
  center: { latitude: number; longitude: number }
): any[] => {
  if (markets.length <= MAX_CACHED_MARKETS) return markets;
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const distSq = (m: any) => {
    const dLat = m.latitude - center.latitude;
    const dLon = (m.longitude - center.longitude) * cosLat;
    return dLat * dLat + dLon * dLon;
  };
  const ranked = [...markets].sort((a, b) => distSq(a) - distSq(b));
  const keepIds = new Set(ranked.slice(0, MAX_CACHED_MARKETS).map((m) => m.id));
  return markets.filter((m) => keepIds.has(m.id));
};

// Bulletproof & 60-FPS TrackedMarker for iOS New Architecture
// 1. Uses React.memo with a deep equality check to ignore inline object/function prop churn.
// 2. Uses a simple 300ms timeout to capture the native snapshot, avoiding onLayout state thrashing.
const TrackedMarker = React.memo(React.forwardRef(({ children, forceTrack, ...props }: any, ref: any) => {
  const [track, setTrack] = useState(true);
  // Hidden until the child's first Yoga layout completes: on the New
  // Architecture a freshly mounted marker child can draw at the map view's
  // origin (top-left "ghost") for a frame before the annotation position is
  // applied. Revealing only after layout eliminates the phantom marker.
  const [isReady, setIsReady] = useState(false);

  // Capture snapshot after 300ms to ensure the native view is fully rendered,
  // then freeze. Also force-reveal in case onLayout never fired.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTrack(false);
      setIsReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // When the marker's visible content changes (selection, mute badge, cluster
  // count) or forceTrack turns off, re-enable tracking just long enough for
  // the animation/new content to be captured, then freeze the snapshot again.
  const childKey = `${forceTrack}|${children?.props?.isSelected}|${children?.props?.isMuted}|${children?.props?.pointCount}`;
  const prevChildKeyRef = useRef(childKey);
  useEffect(() => {
    if (prevChildKeyRef.current !== childKey) {
      prevChildKeyRef.current = childKey;
      setTrack(true);
      const timer = setTimeout(() => setTrack(false), 400);
      return () => clearTimeout(timer);
    }
  }, [childKey]);

  return (
    <Marker
      ref={ref}
      {...props}
      style={[props.style, { opacity: isReady ? 1 : 0 }]}
      tracksViewChanges={forceTrack || track || !isReady}
    >
      <View onLayout={() => setIsReady(true)}>
        {children}
      </View>
    </Marker>
  );
}), (prevProps, nextProps) => {
  // Custom equality check: only re-render if the core data actually changes!
  return (
    prevProps.forceTrack === nextProps.forceTrack &&
    prevProps.coordinate?.latitude === nextProps.coordinate?.latitude &&
    prevProps.coordinate?.longitude === nextProps.coordinate?.longitude &&
    prevProps.children?.props?.isSelected === nextProps.children?.props?.isSelected &&
    prevProps.children?.props?.isMuted === nextProps.children?.props?.isMuted &&
    prevProps.children?.props?.pointCount === nextProps.children?.props?.pointCount
  );
});
TrackedMarker.displayName = 'TrackedMarker';

// Isolated subscriber: isFetchingMarkets toggles twice per Overpass fetch, so
// only this tiny component re-renders instead of the whole map tree.
// Gated on savedStoresOnly: discovery is off in that mode, so a fetch that is
// already in flight elsewhere must not surface a search indicator here.
const FetchingIndicator = () => {
  const isFetchingMarkets = useLocationStore((s) => s.isFetchingMarkets);
  const isOffline = useLocationStore((s) => s.isOffline);
  const isZoomHintVisible = useLocalUIStore((s) => s.isZoomHintVisible);
  const isTooFarHintVisible = useLocalUIStore((s) => s.isTooFarHintVisible);
  const savedStoresOnly = useSettingsStore((s) => s.savedStoresOnly);
  // Offline wins over the spinner: retry probes fail within milliseconds
  // while offline, and flipping pill states every probe would flicker.
  // "Too far" wins over the spinner: no fetch runs for this viewport, so a
  // spinner from a leftover in-flight fetch would promise data that never
  // comes — the hint explains the intentional skip instead.
  const hint = isTooFarHintVisible
    ? 'Too far away — move closer to load shops'
    : !isFetchingMarkets && isZoomHintVisible
      ? 'Zoom in to see shops'
      : undefined;
  return (
    <MapSearchIndicator
      isVisible={(isFetchingMarkets || isZoomHintVisible || isTooFarHintVisible || isOffline) && !savedStoresOnly}
      offline={isOffline}
      hint={!isOffline ? hint : undefined}
    />
  );
};



// Isolated subscriber for manual-add mode, mirroring FetchingIndicator:
// toggling the mode re-renders only this pill, never the map tree or root.
const ManualAddHint = () => {
  const insets = useSafeAreaInsets();
  const isManualAddMode = useLocalUIStore((s) => s.isManualAddMode);
  if (!isManualAddMode) return null;
  return (
    <View style={[styles.manualAddHint, { top: Math.max(20, insets.top) + 56 }]}>
      <Text style={styles.manualAddHintText}>Tap the map to place your shop</Text>
      <TouchableOpacity
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Light);
          useLocalUIStore.getState().setManualAddMode(false);
        }}
      >
        <Text style={styles.manualAddHintCancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

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
        (loc as any).neighborhood,
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

const AsyncAddressText = ({ latitude, longitude, initialAddress, fallbackText = 'Saved Shop', style }: { latitude: number; longitude: number; initialAddress?: string; fallbackText?: string; style?: any }) => {
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(!initialAddress);

  useEffect(() => {
    let mounted = true;
    if (!initialAddress && latitude && longitude) {
      reverseGeocodeAddress(latitude, longitude).then(addr => {
        if (mounted) {
          if (addr) setAddress(addr);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [latitude, longitude, initialAddress]);

  if (loading || (!address && !fallbackText)) return null;

  return (
    <Text style={[{ fontSize: 14, fontWeight: '400', marginTop: 2 }, style]} numberOfLines={1}>
      {address || fallbackText}
    </Text>
  );
};

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

const formatDistanceWithUnit = (meters: number, distanceUnit: string): string => {
  if (distanceUnit === 'imperial') {
    const miles = meters / 1609.34;
    if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
    return `${miles.toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// ── MarkerLayer ──────────────────────────────────────────────────────────────
// Owns clustering state and all marker rendering. Rendered as a child of the
// MapView behind React.memo with ref/stable-callback props, so pans, fetch
// results and selection changes re-render only this subtree — never the
// MapView itself, the bottom sheet or the screen root.
interface MarkerLayerProps {
  mapRef: React.RefObject<MapView | null>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  currentRegionRef: React.MutableRefObject<any>;
  updateClustersRef: React.MutableRefObject<(region: any) => void>;
  onShopSelected: () => void;
}

const MarkerLayer = React.memo(({ mapRef, isAnimatingRef, currentRegionRef, updateClustersRef, onShopSelected }: MarkerLayerProps) => {
  const params = useLocalSearchParams<{ shopId?: string }>();
  const lastTap = useRef(0);

  // While the tab is blurred, all markers are unmounted (see the early return
  // before the JSX below): on iOS the marker children are live UIViews with
  // shadow layers that keep costing GPU time behind the visible tab as long
  // as they exist — destroying them is the only reliable release. Cluster
  // work is likewise deferred and flushed on refocus.
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const pendingPointsRef = useRef<PointFeature<any>[] | null>(null);
  const pendingRegionRef = useRef<any>(null);

  // Detect the blur→focus transition at render time so the remount batch can
  // skip its entrance animations: markers reappear already settled — pixel-
  // identical to how the screen looked when it was blurred. Markers that
  // mount later (new fetch results, cluster changes) animate in as usual.
  const wasFocusedRef = useRef(isFocused);
  const isRestoring = isFocused && !wasFocusedRef.current;
  wasFocusedRef.current = isFocused;

  const locations = useLocationStore((s) => s.locations);
  const cachedMarkets = useLocationStore((s) => s.cachedMarkets);
  const mutedUnsavedShops = useLocationStore((s) => s.mutedUnsavedShops);
  const savedStoresOnly = useSettingsStore((s) => s.savedStoresOnly);
  const selectedShopToSave = useLocalUIStore((s) => s.selectedShopToSave);
  const setSelectedShopToSave = useLocalUIStore((s) => s.setSelectedShopToSave);

  const savedShops = locations ?? [];
  const markets = cachedMarkets || [];

  // Clustering state
  const superclusterRef = useRef(new Supercluster({
    radius: 45,
    maxZoom: 16}));
  const [clusters, setClusters] = useState<any[]>([]);
  // Monotonic id per cluster recompute: several callers race (region
  // debounce, points load, focus flush, locate-me) and only the newest may
  // commit — an older recompute must never overwrite fresher marker state.
  const clusterGenerationRef = useRef(0);

  // O(1) lookup set for saved shop detection — keyed by "name|lat3|lon3"
  const savedShopKeySet = useMemo(() => {
    const set = new Set<string>();
    savedShops.forEach((shop) => {
      const key = `${shop.name}|${shop.latitude.toFixed(3)}|${shop.longitude.toFixed(3)}`;
      set.add(key);
    });
    return set;
  }, [savedShops]);

  const isShopSaved = useCallback((market: any) => {
    const key = `${market.name}|${market.latitude.toFixed(3)}|${market.longitude.toFixed(3)}`;
    return savedShopKeySet.has(key);
  }, [savedShopKeySet]);

  const updateClusters = useCallback((region: any) => {
    if (!region) return;
    if (!isFocusedRef.current) {
      pendingRegionRef.current = region;
      return;
    }
    const generation = ++clusterGenerationRef.current;
    // Preload markers a full screen beyond the viewport in every direction so
    // panning doesn't reveal unpopulated map before the post-pan update lands
    const lngPadding = region.longitudeDelta * 1.0;
    const latPadding = region.latitudeDelta * 1.0;
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2 - lngPadding,
      region.latitude - region.latitudeDelta / 2 - latPadding,
      region.longitude + region.longitudeDelta / 2 + lngPadding,
      region.latitude + region.latitudeDelta / 2 + latPadding,
    ];

    const lngDelta = Math.max(region.longitudeDelta, 0.0001);
    const zoom = Math.max(0, Math.round(Math.log(360 / lngDelta) / Math.LN2));

    try {
      const sc = superclusterRef.current;
      // Anchor each cluster's React key to its first leaf's market id.
      // Supercluster regenerates its own cluster ids on every load(), which
      // previously unmounted + remounted every cluster marker (visible
      // flicker) whenever new markets arrived. A cluster's first leaf
      // survives reloads, so unchanged clusters keep their keys and update
      // count/position in place instead of replaying entrance animations.
      const newClusters = sc.getClusters(bbox, zoom).map((c: any) => {
        if (!c.properties?.cluster) return { ...c, renderKey: String(c.properties?.id) };
        let stableKey = `cluster-${c.id}`;
        try {
          const leaf = sc.getLeaves(c.id, 1)[0];
          if (leaf?.properties?.id != null) stableKey = `cluster-${leaf.properties.id}`;
        } catch {
          // Tree changed under us — fall back to the volatile id
        }
        return { ...c, renderKey: stableKey };
      });
      // Render in key order, not getClusters() KD-tree traversal order. The
      // traversal order shuffles with every bbox/zoom, which moved surviving
      // markers to new sibling positions on each recalc; each move is a
      // remove+insert on MapView's native children, and AIRMap on iOS tracks
      // those with insert-by-index / remove-by-value. Rapid reorder batches
      // through the New-Arch interop queue desync that array and crash in
      // -[NSArrayM insertObject:atIndex:]. Key order keeps surviving markers
      // at fixed sibling positions, so only real appears/disappears mutate
      // the native children.
      newClusters.sort((a: any, b: any) =>
        a.renderKey < b.renderKey ? -1 : a.renderKey > b.renderKey ? 1 : 0
      );
      if (generation !== clusterGenerationRef.current) {
        console.log(`[clusters] discarded stale generation ${generation} (latest: ${clusterGenerationRef.current})`);
        return;
      }
      setClusters(newClusters);
    } catch (error) {
      console.log("Supercluster error:", error);
    }
  }, []);

  // Expose updateClusters to the screen root (region handler + locate button)
  useEffect(() => {
    updateClustersRef.current = updateClusters;
  }, [updateClusters, updateClustersRef]);

  // Load points into Supercluster only when their content actually changed.
  // An identity-only reload regenerates cluster ids, which remounts every
  // cluster marker (new keys) and replays tracking windows — pure waste when
  // e.g. muting a shop rebuilt the points array with identical content.
  const loadedSignatureRef = useRef<string | null>(null);
  const loadPointsIfChanged = useCallback((pts: PointFeature<any>[]) => {
    const signature = pts.map((p) => p.properties.id).join(',');
    if (signature === loadedSignatureRef.current) return false;
    loadedSignatureRef.current = signature;
    superclusterRef.current.load(pts);
    return true;
  }, []);

  // Build Supercluster points from cached markets (dedup + saved filter in single pass)
  const points = useMemo(() => {
    const allPoints: PointFeature<any>[] = [];

    if (!savedStoresOnly) {
      // Deduplicate + saved filter in a single pass (O(n) with Set)
      const seen = new Set<string>();
      for (const market of markets) {
        // Non-finite coordinates would poison cluster centroids with NaN and
        // crash MapKit when the marker annotation is inserted — never let
        // them into the KD-tree.
        if (!Number.isFinite(market.latitude) || !Number.isFinite(market.longitude)) continue;
        const coordKey = `${market.latitude}|${market.longitude}`;
        if (seen.has(coordKey)) continue;
        seen.add(coordKey);

        // Skip saved shops (O(1) lookup)
        if (isShopSaved(market)) continue;

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
      }
    }

    return allPoints;
  }, [markets, isShopSaved, savedStoresOnly]);

  // Flush any cluster work that was deferred while the tab was blurred
  useEffect(() => {
    isFocusedRef.current = isFocused;
    if (!isFocused) return;
    const pendingPoints = pendingPointsRef.current;
    pendingPointsRef.current = null;
    if (pendingPoints && loadPointsIfChanged(pendingPoints)) {
      pendingRegionRef.current = null;
      updateClusters(currentRegionRef.current);
    } else if (pendingRegionRef.current) {
      const region = pendingRegionRef.current;
      pendingRegionRef.current = null;
      updateClusters(region);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => {
    if (!isFocusedRef.current) {
      // Tab is blurred: defer the KD-tree rebuild so hidden markers don't
      // remount offscreen; the focus effect above flushes it on return.
      pendingPointsRef.current = points;
      return;
    }
    if (loadPointsIfChanged(points)) {
      updateClusters(currentRegionRef.current);
    }
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

        const latDelta = currentRegionRef.current?.latitudeDelta || 0.015;
        const lonDelta = currentRegionRef.current?.longitudeDelta || 0.015;
        const adjustedLatitude = shopToSelect.latitude - (latDelta * 0.25);

        mapRef.current.animateToRegion({
          latitude: adjustedLatitude,
          longitude: shopToSelect.longitude,
          latitudeDelta: latDelta,
          longitudeDelta: lonDelta}, 500);

        // Expand the bottom sheet + scroll to top so the preview is visible
        onShopSelected();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.shopId, savedShops.length]);

  // Blurred: unmount every marker so the native annotation views (and their
  // per-frame shadow/compositing cost) are destroyed while the tab is hidden.
  // The MapView itself stays mounted, so the camera position is untouched.
  if (!isFocused) return null;

  return (
    <>
      {savedShops.map((shop) => {
        const isSaved = true;
        const shopId = `saved-${shop.id}`;
        const isSelected = selectedShopToSave?.id === shopId;
        const needsTracking = isSelected;
        const longitude = shop.longitude;
        const latitude = shop.latitude;

        // A marker with a non-finite coordinate throws inside MapKit's
        // addAnnotation (surfaces as -[AIRMap insertReactSubview:atIndex:]).
        // Persisted saved shops rehydrate unvalidated, so guard like the
        // home mini-map does.
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        return (
          <TrackedMarker
            key={shopId}
            coordinate={{ latitude, longitude }}
            anchor={MARKER_ANCHOR}
            forceTrack={needsTracking}
            onPress={(e: any) => {
              e.stopPropagation();
              Keyboard.dismiss();
              const now = Date.now();
              if (now - lastTap.current < 400) return; // Increased from 300 to cover animation duration
              lastTap.current = now;
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);

              setSelectedShopToSave({ ...shop, id: shopId, isSaved: true });

              isAnimatingRef.current = true;
              // Keep the current zoom level if known, otherwise default to 0.01
              const latDelta = currentRegionRef.current?.latitudeDelta || 0.01;
              const lonDelta = currentRegionRef.current?.longitudeDelta || 0.01;
              // Offset latitude so the marker isn't hidden under the bottom sheet
              const adjustedLatitude = latitude - (latDelta * 0.25);

              mapRef.current?.animateToRegion({
                latitude: adjustedLatitude,
                longitude,
                latitudeDelta: latDelta,
                longitudeDelta: lonDelta}, 350);

              // Expand the bottom sheet to medium snap point to show the context card
              onShopSelected();
            }}
          >
            <StoreMarker isSaved={isSaved} isSelected={isSelected} isMuted={!shop.isActive} instant={isRestoring} />
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
              key={cluster.renderKey || `cluster-${clusterId}`}
              coordinate={{ latitude, longitude }}
              forceTrack={false}
              onPress={(e: any) => {
                e.stopPropagation();
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                Keyboard.dismiss();
                isAnimatingRef.current = true;

                // getClusterExpansionZoom throws if the cluster id is stale
                // (points reloaded between render and tap) — fall back to
                // halving the current zoom instead of crashing.
                let latitudeDelta: number;
                let longitudeDelta: number;
                try {
                  const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId);
                  longitudeDelta = 360 / Math.pow(2, zoom);
                  latitudeDelta = longitudeDelta * (SCREEN_HEIGHT / Dimensions.get('window').width);
                } catch (error) {
                  console.log('Stale cluster id, falling back to zoom-in:', error);
                  latitudeDelta = (currentRegionRef.current?.latitudeDelta ?? 0.02) / 2;
                  longitudeDelta = (currentRegionRef.current?.longitudeDelta ?? 0.02) / 2;
                }

                mapRef.current?.animateToRegion({
                  latitude,
                  longitude,
                  latitudeDelta,
                  longitudeDelta}, 350);
              }}
            >
              <MapCluster pointCount={pointCount} onPress={() => {}} instant={isRestoring} />
            </TrackedMarker>
          );
        }

        // Not a cluster, it's an individual marker
        const properties = cluster.properties;
        if (!properties?.id) return null; // Guard against corrupted cluster data
        const isSaved = properties.isSaved;
        const isSelected = selectedShopToSave?.id === properties.id || (isSaved && selectedShopToSave?.id === `saved-${properties.id}`);
        const needsTracking = isSelected;

        return (
          <TrackedMarker
            key={cluster.renderKey}
            coordinate={{ latitude, longitude }}
            anchor={MARKER_ANCHOR}
            forceTrack={needsTracking}
            onPress={(e: any) => {
              e.stopPropagation();
              Keyboard.dismiss();
              const now = Date.now();
              if (now - lastTap.current < 400) return; // Increased from 300 to cover animation duration
              lastTap.current = now;
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);

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
              const latDelta = currentRegionRef.current?.latitudeDelta || 0.01;
              const lonDelta = currentRegionRef.current?.longitudeDelta || 0.01;
              // Offset latitude so the marker isn't hidden under the bottom sheet
              const adjustedLatitude = latitude - (latDelta * 0.25);

              mapRef.current?.animateToRegion({
                latitude: adjustedLatitude,
                longitude,
                latitudeDelta: latDelta,
                longitudeDelta: lonDelta}, 350);

              // Expand the bottom sheet to medium snap point to show the context card
              onShopSelected();
            }}
          >
            <StoreMarker isSaved={isSaved} isSelected={isSelected} isMuted={mutedUnsavedShops.includes(properties.id)} instant={isRestoring} />
          </TrackedMarker>
        );
      })}
    </>
  );
});
MarkerLayer.displayName = 'MarkerLayer';

// ── SheetContent ─────────────────────────────────────────────────────────────
// Owns the bottom-sheet UI state (selection preview, saved/muted lists,
// swipeables, delete confirmation). Isolated behind React.memo so selection
// and list changes never re-render the MapView or the screen root.
interface SheetContentProps {
  mapRef: React.RefObject<MapView | null>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  snapSheetToPreview: () => void;
  resetSheetForSelection: () => void;
  collapseSheet: () => void;
  closeSwipeablesRef: React.MutableRefObject<(exceptId?: string) => void>;
}

const SheetContent = React.memo(({ mapRef, isAnimatingRef, snapSheetToPreview, resetSheetForSelection, collapseSheet, closeSwipeablesRef }: SheetContentProps) => {
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>(null);

  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const removeLocation = useLocationStore((s) => s.removeLocation);
  const cachedMarkets = useLocationStore((s) => s.cachedMarkets);
  const canAddLocation = useLocationStore((s) => s.canAddLocation);
  const mutedUnsavedShops = useLocationStore((s) => s.mutedUnsavedShops);
  const toggleMuteUnsavedShop = useLocationStore((s) => s.toggleMuteUnsavedShop);
  const canMuteShop = useLocationStore((s) => s.canMuteShop);
  const userLocation = useLocationStore((s) => s.userLocation);

  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const isPro = useSettingsStore((s) => s.isPro);

  const selectedShopToSave = useLocalUIStore((s) => s.selectedShopToSave);
  const setSelectedShopToSave = useLocalUIStore((s) => s.setSelectedShopToSave);

  const savedShops = locations ?? [];
  const activeSavedShops = savedShops;
  const mutedSavedShops = savedShops.filter(loc => loc.isActive === false);
  const markets = cachedMarkets || [];

  const formatDistance = (meters: number): string => formatDistanceWithUnit(meters, distanceUnit);

  // Close any open swipeable when another one opens
  const closeAllSwipeables = useCallback((exceptId?: string) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  }, []);

  // Expose to the screen root (map pan/press + sheet scroll handlers)
  useEffect(() => {
    closeSwipeablesRef.current = closeAllSwipeables;
  }, [closeAllSwipeables, closeSwipeablesRef]);

  // Force reset scroll position + bottom sheet snap whenever selected shop changes
  useEffect(() => {
    if (selectedShopToSave) {
      resetSheetForSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopToSave]);

  const renderRightActions = (locId: string, uniqueKey: string) => {
    return (
      <View style={{ width: 88, height: '100%', zIndex: -1, elevation: -1 }}>
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
                swipeableRefs.current.delete(uniqueKey);
                swipeableRefs.current.delete('context-' + locId);
                if (selectedShopToSave && (selectedShopToSave.id === locId || selectedShopToSave.id === `saved-${locId}`)) {
                  setSelectedShopToSave(null);
                }
              },
              onCancel: () => {
                swipeableRefs.current.get(uniqueKey)?.close();
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
    <>
      {/* Header Content moved from CustomHandle */}
      <Animated.View layout={LinearTransition.springify()} className="w-full pt-3 pb-2">
        {selectedShopToSave && !selectedShopToSave.isSaved && (
          <Animated.View
            entering={FadeInDown.duration(200).springify()}
            exiting={FadeOutUp.duration(200)}
            layout={LinearTransition.springify()}
          >
            <View
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
            </View>
            <View
              style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}
            >

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
                      'Shop Limit Reached',
                      isPro
                        ? `You've reached the maximum of ${maxStores} saved shops.`
                        : `You've reached the free limit of ${FREE_TIER.maxSavedStores} saved shops. Upgrade to Pro for unlimited saved shops.`,
                      isPro
                        ? [{ text: 'OK' }]
                        : [
                            { text: 'OK', style: 'cancel' },
                            {
                              text: 'Upgrade to Pro',
                              onPress: () => showPaywall(),
                            },
                          ]
                    );
                    return;
                  }
                  addLocation({
                    name: selectedShopToSave.name || 'Unknown Shop',
                    address: selectedShopToSave.address || 'Unknown Address',
                    latitude: selectedShopToSave.latitude,
                    longitude: selectedShopToSave.longitude});
                  setSelectedShopToSave(null);
                }}
              >
                <Plus size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        {selectedShopToSave && selectedShopToSave.isSaved && (() => {
          const loc = savedShops.find(s => `saved-${s.id}` === selectedShopToSave.id);
          if (!loc) return null;
          const originalId = loc.id;
          return (
          <Animated.View
            entering={FadeInDown.duration(200).springify()}
            exiting={FadeOutUp.duration(200)}
            layout={LinearTransition.springify()}
          >
          <View
            style={{ marginBottom: 14 }}
          >
            <Swipeable
              childrenContainerStyle={{ zIndex: 1, elevation: 1 }}
              ref={(ref) => {
                if (ref) {
                  swipeableRefs.current.set('context-' + originalId, ref);
                } else {
                  swipeableRefs.current.delete('context-' + originalId);
                }
              }}
              renderRightActions={() => renderRightActions(originalId, 'context-' + originalId)}
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
                    <AsyncAddressText
                      latitude={loc.latitude}
                      longitude={loc.longitude}
                      initialAddress={loc.address}
                      style={{ color: '#64748b' }}
                    />
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
                    const options = ['Cancel', muteOption, 'Open in Maps', 'Delete Shop'];
                    const cancelButtonIndex = 0;
                    const destructiveButtonIndex = 3;
                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        options,
                        cancelButtonIndex,
                        destructiveButtonIndex,
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
                                  onPress: () => showPaywall(),
                                },
                              ]
                            );
                            return;
                          }
                          useLocationStore.getState().toggleActive(originalId);
                          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                        } else if (index === 2) {
                          openDirectionsSheet(loc.latitude, loc.longitude);
                        } else if (index === 3) {
                          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                          setDeleteModalData({
                            title: 'Delete Shop?',
                            description: 'You will stop receiving notifications for this shop. This action cannot be undone.',
                            isDestructive: true,
                            confirmLabel: 'Delete',
                            onConfirm: () => {
                              removeLocation(originalId);
                              swipeableRefs.current.delete(originalId);
                              swipeableRefs.current.delete('context-' + originalId);
                              if (selectedShopToSave && (selectedShopToSave.id === originalId || selectedShopToSave.id === `saved-${originalId}`)) {
                                setSelectedShopToSave(null);
                              }
                            },
                            onCancel: () => {
                              swipeableRefs.current.get('context-' + originalId)?.close();
                            }
                          });
                          setDeleteModalVisible(true);
                        }
                      }
                    );
                  }}
                >
                  <MoreHorizontal size={20} color="#94a3b8" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Swipeable>
          </View>
          <View
            style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}
          >

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
          </View>
          </Animated.View>
          );
        })()}

        <Animated.View
          layout={LinearTransition.springify()}
          style={{ marginTop: 0, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>Saved Shops</Text>
          <TouchableOpacity
            style={styles.addManualBtn}
            activeOpacity={0.8}
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              if (useLocalUIStore.getState().isManualAddMode) {
                useLocalUIStore.getState().setManualAddMode(false);
                return;
              }
              if (!canAddLocation(isPro)) {
                const maxStores = getMaxSavedStores(isPro);
                Alert.alert(
                  'Shop Limit Reached',
                  isPro
                    ? `You've reached the maximum of ${maxStores} saved shops.`
                    : `You've reached the free limit of ${FREE_TIER.maxSavedStores} saved shops. Upgrade to Pro for unlimited saved shops.`,
                  isPro
                    ? [{ text: 'OK' }]
                    : [
                        { text: 'OK', style: 'cancel' },
                        {
                          text: 'Upgrade to Pro',
                          onPress: () => showPaywall(),
                        },
                      ]
                );
                return;
              }
              setSelectedShopToSave(null);
              useLocalUIStore.getState().setManualAddMode(true);
              collapseSheet();
            }}
          >
            <Plus size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
      {/* Empty state */}
      {activeSavedShops.length === 0 && (
        <Animated.View
          style={styles.emptyState}
        >
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

        const renderShopCard = (loc: any, index: number, sectionPrefix: string = '') => {
          const uniqueKey = sectionPrefix ? `${sectionPrefix}-${loc.id}` : loc.id;
          if (selectedShopToSave && selectedShopToSave.isSaved && selectedShopToSave.id === `saved-${loc.id}`) {
            return null;
          }
          return (
          <Animated.View
            key={uniqueKey}
            layout={LinearTransition.springify()}
            entering={FadeInDown.duration(300).springify()}
            exiting={FadeOutLeft.duration(200)}
          >
            <Swipeable
              containerStyle={{ marginBottom: 10 }}
              childrenContainerStyle={{ zIndex: 1, elevation: 1 }}
              ref={(ref) => {
                if (ref) {
                  swipeableRefs.current.set(uniqueKey, ref);
                } else {
                  swipeableRefs.current.delete(uniqueKey);
                }
              }}
              renderRightActions={(loc.isUnsaved || sectionPrefix === 'muted') ? undefined : () => renderRightActions(loc.id, uniqueKey)}
              rightThreshold={40}
              overshootRight={false}
              friction={2}
              onSwipeableWillOpen={() => closeAllSwipeables(uniqueKey)}
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
                  snapSheetToPreview();

                  // Select this shop so its preview + marker highlight show
                  const savedId = loc.isUnsaved ? loc.id : `saved-${loc.id}`;
                  setSelectedShopToSave({ ...loc, id: savedId, isSaved: !loc.isUnsaved });
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
                    <AsyncAddressText
                      latitude={loc.latitude}
                      longitude={loc.longitude}
                      initialAddress={loc.address}
                      fallbackText={loc.isUnsaved ? '' : 'Saved Shop'}
                      style={{ color: '#94a3b8' }}
                    />
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
                    const options = loc.isUnsaved ? ['Cancel', muteOption, 'Open in Maps'] : ['Cancel', muteOption, 'Open in Maps', 'Delete Shop'];
                    const cancelButtonIndex = 0;
                    const destructiveButtonIndex = loc.isUnsaved ? undefined : 3;
                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        options,
                        cancelButtonIndex,
                        destructiveButtonIndex,
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
                                  onPress: () => showPaywall(),
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
                          openDirectionsSheet(loc.latitude, loc.longitude);
                        } else if (index === 3 && !loc.isUnsaved) {
                          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                          setDeleteModalData({
                            title: 'Delete Shop?',
                            description: 'You will stop receiving notifications for this shop. This action cannot be undone.',
                            isDestructive: true,
                            confirmLabel: 'Delete',
                            onConfirm: () => {
                              removeLocation(loc.id);
                              swipeableRefs.current.delete(uniqueKey);
                              swipeableRefs.current.delete('context-' + loc.id);
                              if (selectedShopToSave && (selectedShopToSave.id === loc.id || selectedShopToSave.id === `saved-${loc.id}`)) {
                                setSelectedShopToSave(null);
                              }
                            },
                            onCancel: () => {
                              swipeableRefs.current.get(uniqueKey)?.close();
                            }
                          });
                          setDeleteModalVisible(true);
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
            {activeSavedShops.map((loc, index) => renderShopCard(loc, index, 'active'))}

            {/* Subtle count under the list — replaces the header count */}
            {activeSavedShops.length >= 3 && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={{ alignItems: 'center', marginTop: 4, marginBottom: 6 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#BDBDBD' }}>
                  {activeSavedShops.length} shops
                </Text>
              </Animated.View>
            )}

            {allMutedShops.length > 0 && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={{ marginTop: 24, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 22, fontWeight: '600', letterSpacing: -0.6, color: '#64748b' }}>Muted Shops</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#94a3b8', letterSpacing: -0.1 }}>
                  {allMutedShops.length} {allMutedShops.length === 1 ? 'shop' : 'shops'}
                </Text>
              </Animated.View>
            )}
            {allMutedShops.map((loc, index) => renderShopCard(loc, index + activeSavedShops.length, 'muted'))}
          </>
        );
      })()}

      {/* Hint/Placeholder Text — shown when fewer than 3 shops saved overall */}
      {savedShops.length > 0 && savedShops.length < 3 && (
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#BDBDBD' }}>Tap a map marker to add more shops</Text>
        </View>
      )}

      {/* OpenStreetMap attribution (required by ODbL for store data) */}
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Store Data',
              'Store locations are provided by OpenStreetMap.\n\n© OpenStreetMap contributors, available under the Open Database License.',
              [
                {
                  text: 'View on openstreetmap.org',
                  onPress: () => Linking.openURL('https://www.openstreetmap.org/copyright/en'),
                },
                { text: 'OK', style: 'cancel' },
              ]
            );
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ paddingVertical: 4, paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#BDBDBD' }}>Data © OpenStreetMap</Text>
        </TouchableOpacity>
      </View>

      <ConfirmationSheet
        visible={deleteModalVisible}
        data={deleteModalData}
        onDismiss={() => setDeleteModalVisible(false)}
      />
    </>
  );
});
SheetContent.displayName = 'SheetContent';

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const bottomSheetScrollRef = useRef<any>(null);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const currentRegionRef = useRef<any>(null);
  // In-flight Overpass fetches. Requests are not aborted when the user pans
  // away (a completed fetch always lands in the region cache), only on
  // unmount, when the concurrency cap is exceeded, or when stale-purged.
  const inFlightFetchesRef = useRef<Array<{ bbox: StoreBBox; controller: AbortController; startedAt: number }>>([]);
  // Failure-recovery retry state (see FETCH_RETRY_BASE_MS)
  const fetchRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRetryDelayRef = useRef(FETCH_RETRY_BASE_MS);

  // Bridges into the isolated child components — the root communicates with
  // them exclusively through refs and stable callbacks so it never re-renders
  // on map/list activity.
  const updateClustersRef = useRef<(region: any) => void>(() => {});
  const closeSwipeablesRef = useRef<(exceptId?: string) => void>(() => {});

  // Stable ref for fetchMarketsFromOverpass so memoized callbacks always call the latest version
  const fetchMarketsRef = useRef<(region: any, opts?: { bypassCache?: boolean }) => void>(() => {});

  const [initialRegion, setInitialRegion] = useState<any>(null);

  // ── Reconnect probe: toggling connectivity usually happens outside the
  // app (Settings / Control Center), so returning to the foreground is the
  // natural moment the network is back. If we're in the offline state, probe
  // the current viewport immediately instead of waiting out the backoff.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!useLocationStore.getState().isOffline) return;
      if (fetchRetryTimerRef.current) {
        clearTimeout(fetchRetryTimerRef.current);
        fetchRetryTimerRef.current = null;
      }
      fetchRetryDelayRef.current = FETCH_RETRY_BASE_MS;
      const region = currentRegionRef.current;
      if (region) fetchMarketsRef.current(region, { bypassCache: true });
    });
    return () => sub.remove();
  }, []);

  // ── Cleanup on unmount: abort in-flight fetches + clear all timers ──
  useEffect(() => {
    return () => {
      inFlightFetchesRef.current.forEach((f) => f.controller.abort());
      inFlightFetchesRef.current = [];
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      if (fetchRetryTimerRef.current) clearTimeout(fetchRetryTimerRef.current);
      useLocalUIStore.getState().setZoomHintVisible(false);
      useLocalUIStore.getState().setTooFarHintVisible(false);
      useLocalUIStore.getState().setManualAddMode(false);
      useLocationStore.getState().setIsFetchingMarkets(false);
    };
  }, []);

  const snapPoints = useMemo(() => {
    return [180, '40%', '70%'];
  }, []);

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);
  const animatedLocateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - 66 }]}));

  // The loading pill must reflect work relevant to what the user is looking
  // at NOW. Fetches survive panning away (their results always land in the
  // region cache) and a struggling mirror rotation can run for a minute+, so
  // an in-flight fetch for a region the user has left must not keep the
  // spinner alive. Recomputed on every region settle and fetch start/finish.
  // Abort and drop in-flight entries that should have settled long ago.
  // A leaked entry would otherwise suppress fetches for its bbox forever
  // (the coverage check below) and pin the loading pill.
  const purgeStaleFetches = useCallback(() => {
    const now = Date.now();
    const hasStale = inFlightFetchesRef.current.some((f) => now - f.startedAt > STALE_FETCH_MS);
    if (!hasStale) return;
    inFlightFetchesRef.current = inFlightFetchesRef.current.filter((f) => {
      if (now - f.startedAt > STALE_FETCH_MS) {
        console.log('Purging stale in-flight Overpass fetch');
        f.controller.abort();
        return false;
      }
      return true;
    });
  }, []);

  const updateFetchingIndicator = useCallback(() => {
    purgeStaleFetches();
    const region = currentRegionRef.current;
    const relevant = inFlightFetchesRef.current.some((f) =>
      region ? bboxCoverageRatio(f.bbox, regionToBBox(region)) > 0 : true
    );
    useLocationStore.getState().setIsFetchingMarkets(relevant);
  }, [purgeStaleFetches]);

  // Schedule a re-attempt of the current viewport (see FETCH_RETRY_BASE_MS).
  // Keeps an already-pending retry instead of resetting it, so concurrent
  // failures don't double-bump the backoff.
  const scheduleFetchRetry = useCallback(() => {
    if (fetchRetryTimerRef.current) return;
    const delay = fetchRetryDelayRef.current;
    fetchRetryDelayRef.current = Math.min(delay * 2, FETCH_RETRY_MAX_MS);
    fetchRetryTimerRef.current = setTimeout(() => {
      fetchRetryTimerRef.current = null;
      const current = currentRegionRef.current;
      // Bypass the region cache: the retry must actually touch the network,
      // both to recover data and to clear the offline state on reconnect.
      if (current) fetchMarketsRef.current(current, { bypassCache: true });
    }, delay);
  }, []);

  const fetchMarketsFromOverpass = useCallback(async (region: any, opts?: { bypassCache?: boolean }) => {
    const isSavedStoresOnly = useSettingsStore.getState().savedStoresOnly;
    if (isSavedStoresOnly) return;

    const viewportBBox = regionToBBox(region);

    if (region.latitudeDelta > MAX_FETCH_DELTA || region.longitudeDelta > MAX_FETCH_DELTA) {
      console.log("Zoomed out too far, skipping fetch.");
      // Surface the hint only when the viewport shows no markers at all, so
      // "not searched here" doesn't silently read as "no shops here".
      const markets = useLocationStore.getState().cachedMarkets || [];
      const hasVisibleMarket = markets.some((m: any) =>
        m.latitude >= viewportBBox.south && m.latitude <= viewportBBox.north &&
        m.longitude >= viewportBBox.west && m.longitude <= viewportBBox.east
      );
      useLocalUIStore.getState().setZoomHintVisible(!hasVisibleMarket);
      useLocalUIStore.getState().setTooFarHintVisible(false);
      return;
    }
    useLocalUIStore.getState().setZoomHintVisible(false);

    // Viewport centered beyond the pan range: skip the fetch entirely and let
    // the pill explain why nothing loads. Checked after the zoom gate, so at
    // this point the viewport is at most ~MAX_FETCH_DELTA wide and being out
    // of range means the user's own position is off-screen — the hint can't
    // contradict a visible current location. Shown whenever out of range,
    // even over cached shops (new areas there won't populate). Fails open
    // when the location is unknown (permission denied): distance can't be
    // judged, fetch normally.
    const userLoc = useLocationStore.getState().userLocation;
    if (
      userLoc &&
      haversineDistance(region.latitude, region.longitude, userLoc.latitude, userLoc.longitude) > MAX_FETCH_DISTANCE_M
    ) {
      console.log("Viewport too far from user location, skipping fetch.");
      useLocalUIStore.getState().setTooFarHintVisible(true);
      return;
    }
    useLocalUIStore.getState().setTooFarHintVisible(false);

    const cachedData = opts?.bypassCache ? null : mapCacheManager.getStoresForRegion(region);

    if (cachedData) {
      console.log("Cache hit for region:", mapCacheManager.getRegionKey(region));

      // Cached data renders fine while offline, but no fetch runs here to
      // probe the network — keep the retry chain alive so the "No connection"
      // state can clear itself once connectivity returns.
      if (useLocationStore.getState().isOffline) scheduleFetchRetry();

      const prev = useLocationStore.getState().cachedMarkets || [];
      // O(n) dedup via id Set (existing entries win, same as before)
      const seenIds = new Set(prev.map((m: any) => m.id));
      const newOnes: any[] = [];
      for (const market of cachedData) {
        if (!seenIds.has(market.id)) {
          seenIds.add(market.id);
          newOnes.push(market);
        }
      }
      // Nothing new → skip the store write so the cluster tree isn't rebuilt
      if (newOnes.length === 0) return;

      const finalMarkets = trimMarketsByDistance([...prev, ...newOnes], region);
      useLocationStore.getState().setCachedMarkets(finalMarkets);
      return;
    }

    // A fetch already in flight that covers this viewport will populate it
    // when it lands — starting another would only duplicate Overpass load.
    // Stale-purge first so a leaked entry can't block this viewport forever.
    purgeStaleFetches();
    if (inFlightFetchesRef.current.some(
      (f) => bboxCoverageRatio(f.bbox, viewportBBox) >= COVERAGE_HIT_RATIO
    )) {
      return;
    }

    // Cap concurrency: drop the oldest request, not the newest region.
    while (inFlightFetchesRef.current.length >= MAX_CONCURRENT_FETCHES) {
      inFlightFetchesRef.current.shift()?.controller.abort();
    }

    const minDelta = 0.01;
    const latDelta = Math.max(region.latitudeDelta, minDelta);
    const lonDelta = Math.max(region.longitudeDelta, minDelta);

    const fetchBBox: StoreBBox = {
      south: region.latitude - latDelta / 2,
      west: region.longitude - lonDelta / 2,
      north: region.latitude + latDelta / 2,
      east: region.longitude + lonDelta / 2,
    };

    const controller = new AbortController();
    const inFlightEntry = { bbox: fetchBBox, controller, startedAt: Date.now() };
    inFlightFetchesRef.current.push(inFlightEntry);
    updateFetchingIndicator();

    try {
      const fetchedMarkets = await fetchMarkets(fetchBBox.south, fetchBBox.west, fetchBBox.north, fetchBBox.east, controller.signal);

      mapCacheManager.setStoresForRegion(region, fetchedMarkets, fetchBBox);

      const prev = useLocationStore.getState().cachedMarkets || [];
      // O(n) dedup via id Set (existing entries win, same as before)
      const seenIds = new Set(prev.map((m: any) => m.id));
      const newOnes: any[] = [];
      for (const market of fetchedMarkets) {
        if (!seenIds.has(market.id)) {
          seenIds.add(market.id);
          newOnes.push(market);
        }
      }
      // Only write when there is actually something new — a no-op write here
      // previously re-rendered the screen and rebuilt the Supercluster tree
      if (newOnes.length > 0) {
        const finalMarkets = trimMarketsByDistance([...prev, ...newOnes], region);
        useLocationStore.getState().setCachedMarkets(finalMarkets);
      }
      // Network is healthy again — restore the fast retry cadence
      fetchRetryDelayRef.current = FETCH_RETRY_BASE_MS;
      useLocationStore.getState().setIsOffline(false);
    } catch (error: any) {
      // Only a caller-initiated cancellation (unmount, concurrency cap,
      // stale purge) is a non-event. Judge by our own controller, not the
      // error name: an all-mirrors timeout used to surface as an AbortError
      // too, get swallowed here, and permanently kill the retry chain —
      // discovery then stayed dead after reconnect until an app reload.
      if (!controller.signal.aborted) {
        if (error.name === 'TimeoutError') {
          // Expected on slow networks / overloaded mirrors — cached markers
          // keep rendering and the retry below re-probes. Not an app error.
          console.log('Overpass mirrors timed out — retrying with backoff.');
        } else {
          console.log('Error fetching from Overpass:', error);
        }
        // Offline is a distinct UI state ("No connection" pill) so the user
        // reads it as their network, not the app. A definite server failure
        // clears it (the network works); timeouts are ambiguous — hung
        // connections happen both offline and on overloaded mirrors — so
        // they leave the current state alone instead of flickering the pill.
        if (isOfflineError(error)) {
          useLocationStore.getState().setIsOffline(true);
        } else if (error.name !== 'TimeoutError') {
          useLocationStore.getState().setIsOffline(false);
        }
        // Self-heal: nothing re-triggers a fetch while the user sits on the
        // same viewport, so a temporary network failure would leave the map
        // empty until the next pan. Retry the *current* region with capped
        // backoff; the cache / in-flight checks make a landed success a no-op.
        scheduleFetchRetry();
      }
    } finally {
      const idx = inFlightFetchesRef.current.indexOf(inFlightEntry);
      if (idx !== -1) inFlightFetchesRef.current.splice(idx, 1);
      updateFetchingIndicator();
    }
  }, [updateFetchingIndicator, scheduleFetchRetry]);

  // Keep the stable ref in sync with the latest fetchMarketsFromOverpass
  useEffect(() => {
    fetchMarketsRef.current = fetchMarketsFromOverpass;
  }, [fetchMarketsFromOverpass]);

  const handleRegionChangeComplete = useCallback((region: any) => {
    // Publish the latest region synchronously: concurrent recomputes (points
    // load, focus flush) read this ref and must never cluster against a
    // region one gesture behind during rapid zoom/pan.
    currentRegionRef.current = region;
    // Re-evaluate the loading pill against the new viewport: an in-flight
    // fetch for an area the user just panned away from should stop showing,
    // and panning back into it should show it again.
    updateFetchingIndicator();
    // Debounce to prevent cluster engine thrashing during animateToRegion
    if (regionDebounceRef.current) {
      clearTimeout(regionDebounceRef.current);
    }
    regionDebounceRef.current = setTimeout(() => {
      isAnimatingRef.current = false;
      // Always recluster once the region settles — the 420ms debounce alone
      // absorbs mid-animation churn. Skipping while isAnimating swallowed the
      // recalc after programmatic zooms: a tapped cluster never split into
      // its markers, and zooming out past the stale padded bbox left empty
      // map until the next manual pan or a fetch happened to land.
      updateClustersRef.current(region);
    }, isAnimatingRef.current ? 420 : 50);

    // Add a 1 second debounce specifically for fetching from Overpass API
    // so we don't exhaust the service when the user drags repeatedly
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      fetchMarketsRef.current(region);
    }, 1000);
  }, [updateFetchingIndicator]);

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
          currentRegionRef.current = fallbackRegion;
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const latitudeDelta = 0.015;
      const longitudeDelta = 0.015;
      const actualLatitude = location.coords.latitude;
      const actualLongitude = location.coords.longitude;

      useLocationStore.getState().setUserLocation({ latitude: actualLatitude, longitude: actualLongitude });

      // Calculate adjusted latitude to shift visual center above bottom sheet
      const adjustedLatitude = actualLatitude - (latitudeDelta * 0.25);

      const newRegion = {
        latitude: adjustedLatitude,
        longitude: actualLongitude,
        latitudeDelta,
        longitudeDelta};

      if (isInitial) {
        setInitialRegion(newRegion);
        currentRegionRef.current = newRegion;
      } else {
        mapRef.current?.animateToRegion(newRegion, 1000);
        currentRegionRef.current = newRegion;
      }
      updateClustersRef.current(newRegion);

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
        currentRegionRef.current = fallbackRegion;
      }
    }
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const locate = () => {
      if (useLocationStore.persist?.hasHydrated()) {
        handleLocateMe(true);
      } else {
        timeout = setTimeout(locate, 50);
      }
    };
    locate();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable callbacks handed to the isolated children so they can drive the
  // bottom sheet without the root subscribing to any of their state.
  const snapSheetToPreview = useCallback(() => {
    // Expand the bottom sheet to medium snap point to show the context card
    bottomSheetRef.current?.snapToIndex(1);
    // Scroll content to top so the preview is fully visible
    bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const resetSheetForSelection = useCallback(() => {
    // Reset scroll to top immediately (no animation to avoid visual jump)
    bottomSheetScrollRef.current?.scrollTo({ y: 0, animated: false });
    // Expand to medium snap point so preview + shops title + first card are visible
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const collapseSheet = useCallback(() => {
    // Drop to the lowest snap point so the map is unobstructed for pin placement
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Manual add: the tapped coordinate becomes the shop location. The address
  // geocodes in the background while the name prompt is up, so Save never
  // waits on the network.
  const handleManualAddAtCoordinate = useCallback((latitude: number, longitude: number) => {
    useLocalUIStore.getState().setManualAddMode(false);
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    const addressPromise = reverseGeocodeAddress(latitude, longitude);
    Alert.prompt(
      'Add Shop',
      'Enter a name for this shop',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            const address = await addressPromise;
            useLocationStore.getState().addLocation({
              name: name?.trim() || 'My Shop',
              address: address || 'Unknown Address',
              latitude,
              longitude});
          },
        },
      ],
      'plain-text'
    );
  }, []);

  return (
    <AnimatedScreen>
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FetchingIndicator />
      <ManualAddHint />

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
      {initialRegion && typeof initialRegion.latitude === 'number' && !isNaN(initialRegion.latitude) ? (
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
          useLocalUIStore.getState().setSelectedShopToSave(null);
          Keyboard.dismiss();
          closeSwipeablesRef.current();
          // 1. Avoid firing requests during continuous panning
          if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
            fetchDebounceRef.current = null;
          }
        }}
        onPress={(e) => {
          Keyboard.dismiss();
          closeSwipeablesRef.current();
          if (e.nativeEvent.action !== 'marker-press') {
            if (useLocalUIStore.getState().isManualAddMode && e.nativeEvent.coordinate) {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              handleManualAddAtCoordinate(latitude, longitude);
              return;
            }
            useLocalUIStore.getState().setSelectedShopToSave(null);
          }
        }}
      >
        <MarkerLayer
          mapRef={mapRef}
          isAnimatingRef={isAnimatingRef}
          currentRegionRef={currentRegionRef}
          updateClustersRef={updateClustersRef}
          onShopSelected={snapSheetToPreview}
        />
      </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f8fafc' }]} />
      )}



      {/* ── Settings Wheel Button ── */}
      <View
        style={[
          styles.floatingSettingsBtn,
          { top: Math.max(20, insets.top) },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/notification-preferences')}
          style={styles.floatingSettingsInner}
        >
          <Settings size={20} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>



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
      <View style={{ flex: 1, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 }} pointerEvents="box-none">
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
            closeSwipeablesRef.current();
          }}
        >
          <SheetContent
            mapRef={mapRef}
            isAnimatingRef={isAnimatingRef}
            snapSheetToPreview={snapSheetToPreview}
            resetSheetForSelection={resetSheetForSelection}
            collapseSheet={collapseSheet}
            closeSwipeablesRef={closeSwipeablesRef}
          />
        </BottomSheetScrollView>
      </BottomSheet>
      </View>
    </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'},
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

  /* ── Manual add ────────────────────────── */
  addManualBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center'},
  manualAddHint: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16},
  manualAddHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'},
  manualAddHintCancel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600'},

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
});
