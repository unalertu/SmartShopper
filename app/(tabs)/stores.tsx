import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Store, Plus } from 'lucide-react-native';

export default function StoresScreen() {
  const insets = useSafeAreaInsets();

  const locations = [
    { id: 1, name: "Migros Jet", address: "Atatürk Cad. No: 45", distance: "450m" },
    { id: 2, name: "Macrocenter", address: "Sokak Sk. No: 12", distance: "1.2km" },
    { id: 3, name: "BİM", address: "Mahalle Yolu No: 8", distance: "2.1km" },
  ];

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingTop: insets.top + 16, 
          paddingHorizontal: 24,
          paddingBottom: 100 // Space for tab bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="text-3xl font-bold text-slate-900 mb-6">Stores</Text>

        {/* Widget 1: Map Preview */}
        <View 
          className="bg-white border border-slate-100 rounded-[32px] p-6 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
        >
          <View className="h-64 rounded-2xl bg-slate-100 justify-center items-center overflow-hidden">
            <View className="items-center">
              <View className="bg-white p-3 rounded-full shadow-sm mb-3">
                <MapPin size={24} color="#0f172a" />
              </View>
              <Text className="text-slate-500 font-medium text-sm">Map Preview Recording...</Text>
            </View>
          </View>
        </View>

        {/* Widget 2: My Locations */}
        <View 
          className="bg-white border border-slate-100 rounded-[32px] p-6 mb-6 shadow-sm"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-semibold text-slate-900">My Locations</Text>
            <TouchableOpacity className="bg-slate-100 px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <Plus size={14} color="#475569" strokeWidth={2.5} />
              <Text className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Add New</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-y-4">
            {locations.map((loc, index) => (
              <React.Fragment key={loc.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-4">
                    <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center">
                      <Store size={18} color="#64748b" />
                    </View>
                    <View>
                      <Text className="text-slate-900 font-bold text-[15px]">{loc.name}</Text>
                      <Text className="text-slate-400 text-[12px] mt-0.5">{loc.address}</Text>
                    </View>
                  </View>
                  <Text className="text-slate-400 font-bold text-[11px]">{loc.distance}</Text>
                </View>
                {index < locations.length - 1 && (
                  <View className="h-[1px] bg-slate-50 w-full" />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity 
          className="bg-slate-900 h-16 rounded-[24px] justify-center items-center shadow-lg mt-2 mb-10"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }}
        >
          <Text className="text-white font-bold text-lg">Create New Geofence Area</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
