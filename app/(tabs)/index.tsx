import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, ShoppingBag, Crown, Plus, Home, Users, User, List, ChevronRight, Radar, BellRing, MapPin, X, PlusCircle, MapPinPlus, CheckCircle, Settings, ScanBarcode } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isNearStore, setIsNearStore] = useState(true); // Toggle this to test both states
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const shoppingLists = [
    { id: 1, name: "Ahmet için alınacaklar", count: 4 }, 
    { id: 2, name: "Kendi ihtiyaçlarım", count: 12 }, 
    { id: 3, name: "Buse'ye alınacaklar", count: 2 }
  ];

  return (
    // 1. ROOT MUST BE A STANDARD VIEW, NOT SafeAreaView!
    <View className="flex-1 bg-slate-50"> 
      <StatusBar style="dark" />
      
      {/* 2. THE SCROLLING CONTENT (SIBLING 1) */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 150 }} // Only need bottom padding now for the nav bar
        showsVerticalScrollIndicator={false}
      >
        {/* 1. THE NORMAL SCROLLING HEADER */}
        <View 
          className="px-6 flex-row justify-between items-center" 
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-2">
            <Image source={require('../../assets/images/app-logo.png')} style={{ width: 56, height: 56, marginLeft: -6, marginTop: -4 }} resizeMode="contain" />
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">Smart Shopper</Text>
          </View>
          <View className="bg-white rounded-full px-3 py-1 flex-row items-center gap-1.5 shadow-sm border border-slate-100" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
            <Flame size={16} color="#f97316" fill="#f97316" />
            <Text className="text-slate-800 font-bold text-sm">0</Text>
          </View>
        </View>

        {/* 2. THE MAP WIDGET */}
          {/* Smart Status Card */}
          <View 
            className="mx-6 mt-1 mb-6 rounded-[32px] bg-white border border-slate-50 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.04,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            {isNearStore ? (
              // State B: Active / Store Nearby
              <View className="flex-col">
                {/* Upper Tier: Static Map Image */}
                <Image 
                  source={require('../../assets/images/stockmap.png')} 
                  className="w-full h-48 rounded-t-[32px]" 
                  resizeMode="cover" 
                />

                {/* Divider */}
                <View className="h-[1px] w-full bg-slate-100" />

                {/* Lower Tier: Info & Action */}
                <View className="flex-row justify-between items-center py-4 px-6">
                  <View className="flex-row items-center gap-3">
                    <View className="relative">
                      <BellRing size={24} color="#64748b" />
                      <View className="absolute -top-0.5 -right-0.5 bg-green-400 w-2.5 h-2.5 rounded-full border-[1.5px] border-white" />
                    </View>
                    <Text className="text-[16px] font-bold text-slate-900 tracking-tight">Migros is nearby</Text>
                  </View>
                  <TouchableOpacity className="bg-slate-100 px-4 py-2 rounded-full">
                    <Text className="text-slate-800 font-bold text-[11px] uppercase tracking-widest">open list</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // State A: Idle / Searching
              <View className="flex-row items-center gap-4 p-6">
                <View className="bg-slate-100 p-3 rounded-full">
                  <Radar size={24} color="#94a3b8" />
                </View>
                <View>
                  <Text className="text-[15px] font-bold text-slate-800">Background Tracking Active</Text>
                  <Text className="text-[13px] font-medium text-slate-400 mt-0.5">No saved stores nearby.</Text>
                </View>
              </View>
            )}
          </View>

          {/* 3. My Lists Section */}
          <Text className="text-[22px] font-extrabold tracking-tight mx-6 mb-4 text-slate-900">My Lists</Text>
          {shoppingLists.map((list) => (
            <TouchableOpacity 
              key={list.id} 
              onPress={() => router.push(`/list/${list.id}`)}
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
                  <List size={22} color="#334155" />
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-slate-900 tracking-tight">{list.name}</Text>
                  <Text className="text-[13px] font-medium text-slate-400 mt-1">{list.count} items</Text>
                </View>
              </View>
              <ChevronRight size={24} color="#cbd5e1" />
            </TouchableOpacity>
          ))}

          {/* 5. Secondary "Premium" Card */}
          <View 
            className="mx-6 mt-5 bg-white rounded-[32px] p-6 min-h-[160px] relative overflow-hidden border border-slate-50"
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
          </View>
          
          {/* Pagination dots */}
          <View className="flex-row justify-center mt-5 gap-2">
            <View className="w-[7px] h-[7px] rounded-full bg-slate-900" />
            <View className="w-[7px] h-[7px] rounded-full border border-slate-300 bg-transparent" />
            <View className="w-[7px] h-[7px] rounded-full border border-slate-300 bg-transparent" />
          </View>

          {/* 6. "Recently Uploaded" Section */}
          <Text className="text-[22px] font-extrabold tracking-tight mx-6 mt-10 mb-4 text-slate-900">Recently uploaded</Text>
          
          <View 
            className="mx-6 bg-white rounded-[32px] p-6 items-center border border-slate-50"
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
          </View>
        </ScrollView>
    </View>
  );
}
