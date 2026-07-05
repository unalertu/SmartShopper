import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PurchaseSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Replace so the user cannot go back to this success screen
      router.replace('/pro');
    }, 6000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 bg-[#F2F2F7] items-center justify-center">
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.12)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        className="absolute w-full h-full"
      />
      
      <Animated.View 
        entering={ZoomIn.duration(600).springify()}
        className="items-center"
      >
        <View className="mb-8">
          <Text style={{ fontSize: 42, fontWeight: '700', letterSpacing: -0.8, color: '#0f172a' }}>
            GeoCart<Text style={{ fontSize: 42, fontWeight: '700', color: '#D4AF37' }}> Pro</Text>
          </Text>
        </View>
        
        <Animated.Text 
          entering={FadeIn.delay(300).duration(400)}
          className="text-2xl font-extrabold text-slate-900 mb-3"
        >
          Purchase Successful
        </Animated.Text>
        
        <Animated.Text 
          entering={FadeIn.delay(500).duration(400)}
          className="text-[15px] text-slate-500 text-center px-10 font-medium leading-6"
        >
          Welcome! Preparing your{'\n'}new features...
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
