import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Users } from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';

export default function SharedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <AnimatedScreen>
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 16 }} className="px-6 pb-6">
        <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">Shared</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6" style={{ marginTop: -60 }}>
        <View className="bg-slate-100 w-20 h-20 rounded-full items-center justify-center mb-5">
          <Users size={36} color="#94a3b8" strokeWidth={1.5} />
        </View>
        <Text className="text-lg font-bold text-slate-800 mb-2">Collaborative Shopping</Text>
        <Text className="text-sm text-slate-400 text-center leading-5">
          Share lists with family and friends{'\n'}and shop together in real-time.
        </Text>
      </View>
    </View>
    </AnimatedScreen>
  );
}
