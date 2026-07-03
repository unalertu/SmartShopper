import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Check,
  Crosshair,
  Sparkles} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useLocationStore, useSettingsStore } from "@/store";
import { getCurrentLocation } from "@/services/locationService";
import { Colors } from "@/constants/theme";
import { FREE_TIER, getMaxSavedStores } from "@/constants/tierConfig";
import { showPaywall } from "@/services/paywallService";

export default function AddLocationScreen() {
  const router = useRouter();
  const addLocation = useLocationStore((s) => s.addLocation);
  const canAddLocation = useLocationStore((s) => s.canAddLocation);
  const getSavedStoreCount = useLocationStore((s) => s.getSavedStoreCount);
  const isPro = useSettingsStore((s) => s.isPro);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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

    // Check saved store limit before adding
    if (!canAddLocation(isPro)) {
      const maxStores = getMaxSavedStores(isPro);
      Alert.alert(
        'Store Limit Reached',
        isPro
          ? `You've reached the maximum of ${maxStores} saved stores.`
          : `You've reached the free limit of ${FREE_TIER.maxSavedStores} saved stores. Upgrade to Pro for unlimited saved stores.`,
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
      name: name.trim(),
      address: address.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
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
          {/* Store Limit Indicator */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-xs font-medium text-surface-400">
                {getSavedStoreCount()} / {getMaxSavedStores(isPro)} stores saved
              </Text>
              {!isPro && (
                <Pressable
                  onPress={() => showPaywall()}
                  className="flex-row items-center gap-1"
                >
                  <Sparkles size={12} color="#D4AF37" />
                  <Text className="text-xs font-semibold text-[#D4AF37]">Get more with Pro</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

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
              cursorColor={Colors.primary[900]}
              selectionColor={Colors.primary[900]}
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
              cursorColor={Colors.primary[900]}
              selectionColor={Colors.primary[900]}
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
            className="mt-5 mb-8"
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
                  cursorColor={Colors.primary[900]}
                  selectionColor={Colors.primary[900]}
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
                  cursorColor={Colors.primary[900]}
                  selectionColor={Colors.primary[900]}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
