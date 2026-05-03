import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Store, Plus, ChevronRight, Search, SlidersHorizontal, ShoppingBasket, LocateFixed } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { fetchMarkets } from '../../services/overpassService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['30%', '50%', '90%'], []);

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);
  const animatedLocateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: animatedPosition.value - 66,
        },
      ],
    };
  });

  const [markets, setMarkets] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

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
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
      fetchMarketsFromOverpass(newRegion);
    } catch (error) {
      console.warn('Error fetching location', error);
    }
  };

  useEffect(() => {
    handleLocateMe();
  }, []);

  const locations = [
    { id: 1, name: "Migros Jet", address: "Atatürk Cad. No: 45", distance: "450m", latitude: 41.0082, longitude: 28.9784 },
    { id: 2, name: "Macrocenter", address: "Sokak Sk. No: 12", distance: "1.2km", latitude: 41.0112, longitude: 28.9804 },
    { id: 3, name: "BİM", address: "Mahalle Yolu No: 8", distance: "2.1km", latitude: 41.0052, longitude: 28.9754 },
  ];

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
        mapPadding={{ top: 0, right: 0, bottom: SCREEN_HEIGHT * 0.3, left: 0 }}
        showsUserLocation={true}
        followsUserLocation={false}
        showsPointsOfInterest={false}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {markets.map(market => (
          <Marker 
            key={market.id} 
            coordinate={{ latitude: market.latitude, longitude: market.longitude }}
            title={market.name}
          >
            <View className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
              <ShoppingBasket size={18} color="#0f172a" />
            </View>
          </Marker>
        ))}
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
        handleComponent={() => (
          <View className="w-full pt-5 pb-2 px-6">
            <Text className="text-[22px] font-extrabold tracking-tight text-slate-900">Saved Shops</Text>
          </View>
        )}
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
          {locations.map((loc) => (
            <TouchableOpacity 
              key={loc.id} 
              className="mb-3.5 bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-100 shadow-sm"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}
              onPress={() => {
                const region = {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };
                mapRef.current?.animateToRegion(region, 800);
                bottomSheetRef.current?.snapToIndex(0);
              }}
            >
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 w-[54px] h-[54px] rounded-full items-center justify-center border border-slate-100">
                  <Store size={22} color="#0f172a" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-slate-900 tracking-tight mb-0.5">{loc.name}</Text>
                  <Text className="text-[13px] font-medium text-slate-500" numberOfLines={1}>{loc.address}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2 pl-2">
                <Text className="text-slate-500 font-bold text-[13px]">{loc.distance}</Text>
                <ChevronRight size={18} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            className="bg-slate-900 h-[64px] rounded-[24px] justify-center items-center shadow-lg mt-4 flex-row gap-2"
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 }}
          >
            <Plus size={22} color="#fff" />
            <Text className="text-white font-bold text-[16px]">Add New Store</Text>
          </TouchableOpacity>
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0f172a',
    transform: [{ rotate: '180deg' }],
    marginTop: -1,
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
  sheetHeader: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  }
});
