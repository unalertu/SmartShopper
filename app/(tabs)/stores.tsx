import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Store, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        const location = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      } catch (error) {
        console.warn('Error fetching location', error);
      }
    })();
  }, []);

  const locations = [
    { id: 1, name: "Migros Jet", address: "Atatürk Cad. No: 45", distance: "450m" },
    { id: 2, name: "Macrocenter", address: "Sokak Sk. No: 12", distance: "1.2km" },
    { id: 3, name: "BİM", address: "Mahalle Yolu No: 8", distance: "2.1km" },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingBottom: 150 // Space for tab bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Title */}
        <View 
          className="px-6 flex-row justify-between items-center mb-6" 
          style={{ paddingTop: Math.max(20, insets.top + 10) }}
        >
          <View className="flex-row items-center gap-4">
            <Text className="text-[28px] font-extrabold text-slate-900 tracking-tight">Stores</Text>
          </View>
        </View>

        <View 
          className="mx-6 mb-8 bg-white border border-slate-50 rounded-[32px] overflow-hidden"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3, height: 220 }}
        >
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: 41.0082,
              longitude: 28.9784,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsCompass={false}
            showsUserLocation={true}
            customMapStyle={[
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]}
          />
        </View>

        {/* My Locations Header */}
        <View className="mx-6 mb-4">
          <Text className="text-[22px] font-extrabold tracking-tight text-slate-900">My Locations</Text>
        </View>

        {/* Individual Store Cards */}
        {locations.map((loc) => (
          <TouchableOpacity 
            key={loc.id} 
            className="mx-6 mb-3 bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-50"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.04,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center gap-4">
              <View className="bg-slate-100 w-[52px] h-[52px] rounded-full items-center justify-center">
                <Store size={22} color="#334155" />
              </View>
              <View>
                <Text className="text-[16px] font-bold text-slate-900 tracking-tight">{loc.name}</Text>
                <Text className="text-[13px] font-medium text-slate-400 mt-1">{loc.address}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-400 font-bold text-[12px]">{loc.distance}</Text>
              <ChevronRight size={18} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        ))}

        {/* Primary Action Button */}
        <TouchableOpacity 
          className="mx-6 bg-slate-900 h-16 rounded-[24px] justify-center items-center shadow-lg mt-6 mb-10"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }}
        >
          <Text className="text-white font-bold text-lg">Add New Store</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
