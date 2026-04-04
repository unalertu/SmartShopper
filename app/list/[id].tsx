import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreHorizontal, ShoppingBag, CheckCircle, Clock, Trash2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function ListDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const dummyItems = [
    { id: 1, name: 'Süt', isCompleted: true },
    { id: 2, name: 'Ekmek', isCompleted: false },
    { id: 3, name: 'Yumurta (15\'li)', isCompleted: false },
    { id: 4, name: 'Zeytin', isCompleted: true },
    { id: 5, name: 'Domates', isCompleted: false },
    { id: 6, name: 'Kaşar Peyniri', isCompleted: false },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* 1. Custom Header */}
      <View 
        className="pb-4 px-6 flex-row justify-between items-center bg-white border-b border-slate-100"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-slate-100 p-3 rounded-full"
        >
          <ArrowLeft size={20} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
        
        <Text className="text-base font-semibold text-slate-900">List Details</Text>
        
        <TouchableOpacity className="bg-slate-100 p-3 rounded-full">
          <MoreHorizontal size={20} color="#0f172a" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }} // Space for floating button
        showsVerticalScrollIndicator={false}
      >
        {/* 2. List Typography & Date */}
        <View className="bg-slate-100 self-start px-3 py-1 rounded-lg mx-6 mt-6">
          <Text className="text-sm font-semibold text-slate-500">5:46 PM</Text>
        </View>

        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mx-6 mt-4 mb-6 leading-tight">
          Ahmet için alınacaklar
        </Text>

        {/* 3. Bento Grid Stats */}
        <View className="flex-row mx-6 gap-3 mb-8">
          {/* Card 1 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" style={{ elevation: 2 }}>
            <View className="flex-row items-center gap-2 mb-3">
              <ShoppingBag size={14} color="#64748b" />
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Items</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">12</Text>
          </View>

          {/* Card 2 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" style={{ elevation: 2 }}>
            <View className="flex-row items-center gap-2 mb-3">
              <CheckCircle size={14} color="#10b981" />
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">4</Text>
          </View>

          {/* Card 3 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" style={{ elevation: 2 }}>
            <View className="flex-row items-center gap-2 mb-3">
              <Clock size={14} color="#f59e0b" />
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remaining</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">8</Text>
          </View>
        </View>

        {/* 4. The Shopping Items */}
        <View className="mx-6 bg-white rounded-3xl border border-slate-100 p-2 shadow-sm" style={{ elevation: 1 }}>
          {dummyItems.map((item, index) => (
            <View key={item.id}>
              <View className="flex-row items-center justify-between p-4 bg-white rounded-2xl">
                <View className="flex-row items-center gap-4 flex-1">
                  {/* Circular Checkbox */}
                  <TouchableOpacity 
                    className={`w-6 h-6 rounded-full border-[2px] items-center justify-center ${
                      item.isCompleted ? 'bg-slate-900 border-slate-900' : 'bg-transparent border-slate-300'
                    }`}
                  >
                    {item.isCompleted && <CheckCircle size={14} color="#ffffff" strokeWidth={3} />}
                  </TouchableOpacity>
                  
                  {/* Item Text */}
                  <Text 
                    className={`text-[16px] font-bold ${
                      item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                    }`}
                  >
                    {item.name}
                  </Text>
                </View>

                {/* Right Action */}
                <TouchableOpacity className="p-2">
                  <Trash2 size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              {/* Divider (hide for last item) */}
              {index < dummyItems.length - 1 && (
                <View className="h-[1px] bg-slate-50 ml-14 mr-4" />
              )}
            </View>
          ))}
        </View>

      </ScrollView>

      {/* 5. The Bottom Floating Button */}
      <View 
        className="absolute left-6 right-6 z-50"
        style={{ bottom: insets.bottom > 0 ? insets.bottom + 16 : 40 }}
      >
        <TouchableOpacity 
          className="bg-slate-900 py-[18px] rounded-full flex-row justify-center items-center shadow-lg"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}
        >
          <Text className="text-white font-extrabold text-[17px] tracking-wide">Add New Item</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  );
}
