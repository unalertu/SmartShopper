import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Check,
  Crosshair,
  Minus,
  Plus} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useLocationStore } from "@/store";
import { getCurrentLocation } from "@/services/locationService";
import { Colors, GEOFENCE_DEFAULT_RADIUS } from "@/constants/theme";

export default function AddLocationScreen() {
  const router = useRouter();
  const addLocation = useLocationStore((s) => s.addLocation);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState(GEOFENCE_DEFAULT_RADIUS);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    const location = await getCurrentLocation();
    if (location) {
      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));
    }
    setIsLoadingLocation(false);
  };

  const isValid =
    name.trim() &&
    latitude &&
    longitude &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  const handleAdd = () => {
    if (!isValid) return;

    addLocation({
      name: name.trim(),
      address: address.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius});
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(400)}
          className="flex-row items-center justify-between px-6 pt-2 pb-4"
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-100 items-center justify-center"
          >
            <X size={20} color={Colors.surface[600]} />
          </Pressable>
          <Text className="text-lg font-bold text-surface-900">
            Add Store
          </Text>
          <Pressable
            onPress={handleAdd}
            disabled={!isValid}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isValid ? "bg-primary-500" : "bg-surface-200"
            }`}
          >
            <Check
              size={20}
              color={isValid ? "#ffffff" : Colors.surface[400]}
            />
          </Pressable>
        </Animated.View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Store Name */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">
              Store Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Walmart, Local Market"
              placeholderTextColor={Colors.surface[300]}
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-base text-surface-900 shadow-sm"
              
            />
          </Animated.View>

          {/* Address */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            className="mt-5"
          >
            <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">
              Address (Optional)
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g., 123 Main Street"
              placeholderTextColor={Colors.surface[300]}
              className="bg-white rounded-2xl px-4 py-4 text-base text-surface-900 shadow-sm"
              
            />
          </Animated.View>

          {/* Use Current Location Button */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            className="mt-5"
          >
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={isLoadingLocation}
              className="bg-primary-50 rounded-2xl p-4 flex-row items-center justify-center border border-primary-200"
            >
              {isLoadingLocation ? (
                <ActivityIndicator color={Colors.primary[500]} />
              ) : (
                <>
                  <Crosshair
                    size={20}
                    color={Colors.primary[500]}
                    strokeWidth={2.5}
                  />
                  <Text className="text-base font-semibold text-primary-500 ml-2">
                    Use Current Location
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Coordinates */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(400)}
            className="mt-5"
          >
            <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">
              Coordinates
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="Latitude"
                  placeholderTextColor={Colors.surface[300]}
                  keyboardType="numeric"
                  className="bg-white rounded-2xl px-4 py-4 text-base text-surface-900 shadow-sm"
                  
                />
              </View>
              <View className="flex-1">
                <TextInput
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="Longitude"
                  placeholderTextColor={Colors.surface[300]}
                  keyboardType="numeric"
                  className="bg-white rounded-2xl px-4 py-4 text-base text-surface-900 shadow-sm"
                  
                />
              </View>
            </View>
          </Animated.View>

          {/* Radius */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(500)}
            className="mt-5 mb-8"
          >
            <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">
              Geofence Radius
            </Text>
            <View
              className="bg-white rounded-2xl p-4 shadow-sm"
              
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setRadius(Math.max(50, radius - 50))}
                  className="w-10 h-10 rounded-xl bg-surface-100 items-center justify-center"
                >
                  <Minus size={18} color={Colors.surface[600]} />
                </Pressable>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-surface-900">
                    {radius}
                  </Text>
                  <Text className="text-xs text-surface-400">meters</Text>
                </View>
                <Pressable
                  onPress={() => setRadius(Math.min(1000, radius + 50))}
                  className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center"
                >
                  <Plus size={18} color={Colors.primary[500]} />
                </Pressable>
              </View>
              <View className="flex-row justify-between mt-3 px-2">
                {[50, 100, 200, 500].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRadius(r)}
                    className={`px-3 py-1.5 rounded-lg ${
                      radius === r ? "bg-primary-100" : "bg-surface-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        radius === r ? "text-primary-500" : "text-surface-400"
                      }`}
                    >
                      {r}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
