import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ChevronDown, MapPin, Save, ShieldAlert, Clock, ArrowRightLeft, ShoppingBasket, Search, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fetchMarkets } from '../services/overpassService';

// Mock store data for testing
const MOCK_STORE = {
  id: 'store_123',
  name: 'Migros Jet',
  latitude: 41.0082,
  longitude: 28.9784,
};

export default function GeofenceConfigurationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // States
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [triggerType, setTriggerType] = useState<'entry' | 'dwell'>('entry');
  const [note, setNote] = useState<string>('');

  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [userRegion, setUserRegion] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialFetch = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Foreground location permission denied.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };
        
        setUserRegion(newRegion);
        setCurrentRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);

        // Fetch with a wider area for initial load
        const wideRegion = { ...newRegion, latitudeDelta: 0.06, longitudeDelta: 0.06 };
        hasInitialFetch.current = true;
        fetchMarketsFromOverpass(wideRegion);
      } catch (error) {
        console.error('Error fetching live location:', error);
      }
    })();
  }, []);

  const fetchMarketsFromOverpass = async (region: any) => {
    if (region.latitudeDelta > 0.15) {
      console.log("Zoomed out too far, skipping fetch.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorStatus(null);

      // Use a minimum search area so we always search at least ~4km
      const minDelta = 0.04;
      const latDelta = Math.max(region.latitudeDelta, minDelta);
      const lonDelta = Math.max(region.longitudeDelta, minDelta);

      const south = region.latitude - latDelta / 2;
      const west = region.longitude - lonDelta / 2;
      const north = region.latitude + latDelta / 2;
      const east = region.longitude + lonDelta / 2;

      console.log(`🗺️ Searching area: ${latDelta.toFixed(4)} x ${lonDelta.toFixed(4)}`);
      const fetchedMarkets = await fetchMarkets(south, west, north, east);
      setMarkets(fetchedMarkets);
      console.log(`📍 Found ${fetchedMarkets.length} stores`);
      
      if (fetchedMarkets.length === 0) {
        setErrorStatus(null); // Don't show error — empty is fine
      }
    } catch (error: any) {
      console.error('Error fetching from Overpass:', error);
      setErrorStatus("Servers busy. Tap to retry.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch stores when user pans/zooms the map (debounced)
  const handleRegionChangeComplete = (region: any) => {
    setCurrentRegion(region);
    
    // Skip the auto-fetch for the initial MOCK_STORE region before we have user location
    if (!hasInitialFetch.current) return;

    // Debounce: wait 1.5 seconds after the user stops moving the map
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMarketsFromOverpass(region);
    }, 1500);
  };

  // Map Region — use user location if available, otherwise fallback to mock
  const mapRegion = userRegion || {
    latitude: MOCK_STORE.latitude,
    longitude: MOCK_STORE.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const requestBackgroundLocationPermission = async () => {
    try {
      // First, need foreground permissions
      const fgStatus = await Location.requestForegroundPermissionsAsync();
      if (fgStatus.status !== 'granted') {
        Alert.alert('Permission Denied', 'Foreground location permission is required for background tracking.');
        setIsTracking(false);
        return;
      }

      // Check/Request Background permissions
      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus.status !== 'granted') {
        Alert.alert(
          'Background Location Needed',
          'To be notified when you are near this store even when the app is closed, please open Settings and select "Allow all the time".',
          [{ text: 'OK' }]
        );
        setIsTracking(false);
      }
    } catch (error) {
      console.warn(error);
      setIsTracking(false);
    }
  };

  const handleTrackingToggle = (value: boolean) => {
    setIsTracking(value);
    if (value) {
      requestBackgroundLocationPermission();
    }
  };

  const handleSave = () => {
    const configPayload = {
      storeId: MOCK_STORE.id,
      storeName: MOCK_STORE.name,
      isActive: isTracking,
      triggerType: triggerType,
      customNote: note,
    };
    
    console.log('✅ SAVED GEOFENCE CONFIGURATION:\n', JSON.stringify(configPayload, null, 2));
    
    Alert.alert('Configuration Saved', 'Your location tracking settings have been updated.', [
      { text: 'Done', onPress: () => router.back() }
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* MAP SECTION (Top 55-60%) */}
      <View className="flex-[0.55] relative">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={mapRegion}
          showsUserLocation={true}
          followsUserLocation={false}
          showsPointsOfInterest={false}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {/* Dynamically Fetched Supermarkets */}
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
        
        <View 
           className="absolute top-14 left-0 right-0 items-center pointer-events-box-none"
           style={{ marginTop: Platform.OS === 'android' ? insets.top : undefined, zIndex: 10 }}
        >
          <View className="items-center">
            <TouchableOpacity
              onPress={() => currentRegion && fetchMarketsFromOverpass(currentRegion)}
              disabled={isLoading || !currentRegion}
              className="bg-white/95 flex-row items-center gap-2 px-5 py-3 rounded-full shadow-md"
              style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Search size={18} color="#0ea5e9" strokeWidth={2.5} />
              )}
              <Text className="text-[15px] font-bold text-slate-800">
                {isLoading ? 'Searching...' : 'Search this area'}
              </Text>
            </TouchableOpacity>
            
            {errorStatus && (
              <Animated.View 
                entering={FadeInDown.duration(300)}
                className="bg-slate-900/90 flex-row items-center gap-2 px-3 py-1.5 rounded-full mt-3 shadow-lg border border-slate-700"
              >
                <AlertCircle size={14} color="#fca5a5" />
                <Text className="text-[12px] font-bold text-white uppercase tracking-tight">{errorStatus}</Text>
              </Animated.View>
            )}
          </View>
        </View>


      </View>

      {/* BOTTOM SHEET / CONTROL PANEL (Bottom 40-45%) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-[0.45] bg-white rounded-t-[32px] -mt-8 shadow-lg"
        style={{
          shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
        }}
      >
        {/* Grabber handle layout */}
        <View className="w-full items-center pt-4 pb-2">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </View>

        <ScrollView 
          className="flex-1 px-6 pb-8" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Header */}
          <Text className="text-[24px] font-extrabold text-slate-900 tracking-tight mb-6">
            {MOCK_STORE.name} Config
          </Text>

          {/* 1. Tracking Toggle Section */}
          <View className="mb-6 bg-white border border-slate-100 p-4 rounded-[20px] flex-row items-center justify-between shadow-sm">
             <View className="flex-row items-center gap-3 max-w-[80%]">
               <View className={`p-2.5 rounded-full ${isTracking ? 'bg-green-100' : 'bg-slate-100'}`}>
                 <ShieldAlert size={20} color={isTracking ? '#16a34a' : '#94a3b8'} />
               </View>
               <View>
                 <Text className="text-[16px] font-bold text-slate-900">Enable Tracking</Text>
                 <Text className="text-[12px] text-slate-500 mt-0.5 max-w-[95%]">Get notified when you are near this store.</Text>
               </View>
             </View>
             <Switch
                value={isTracking}
                onValueChange={handleTrackingToggle}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
                thumbColor="#ffffff"
             />
          </View>

          {/* 3. Trigger Event Selector */}
          <Text className="text-[14px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Notify Me</Text>
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity 
              onPress={() => setTriggerType('entry')}
              className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${triggerType === 'entry' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <ArrowRightLeft size={18} color={triggerType === 'entry' ? '#d97706' : '#64748b'} />
              <Text className={`font-bold ${triggerType === 'entry' ? 'text-amber-700' : 'text-slate-600'}`}>On Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setTriggerType('dwell')}
              className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${triggerType === 'dwell' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <Clock size={18} color={triggerType === 'dwell' ? '#d97706' : '#64748b'} />
               <Text className={`font-bold ${triggerType === 'dwell' ? 'text-amber-700' : 'text-slate-600'}`}>On Dwell {'>'}5m</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Notes Input */}
          <Text className="text-[14px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Shopping Note / Reminder</Text>
          <View className="bg-slate-50 rounded-[20px] mb-6 p-1 border border-slate-100">
            <TextInput
              className="px-4 py-4 text-[16px] text-slate-900 min-h-[100px] font-medium"
              placeholder="e.g., Don't forget the milk!"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* 5. Save Button */}
          <TouchableOpacity 
            onPress={handleSave}
            className="bg-slate-900 py-4 rounded-[20px] flex-row items-center justify-center gap-2 shadow-md shadow-slate-900/20 mt-2 mb-8"
          >
            <Save size={20} color="#ffffff" />
            <Text className="text-white text-[17px] font-extrabold tracking-wide">Save Configuration</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
