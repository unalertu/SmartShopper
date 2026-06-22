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
  Minus,
  Plus,
  Lock,
  Sparkles} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useLocationStore, useSettingsStore } from "@/store";
import { getCurrentLocation } from "@/services/locationService";
import { Colors, GEOFENCE_DEFAULT_RADIUS } from "@/constants/theme";
import { FREE_TIER, getMaxSavedStores } from "@/constants/tierConfig";

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
  const [radius, setRadius] = useState(GEOFENCE_DEFAULT_RADIUS);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Free users are locked to the default radius
  const canAdjustRadius = isPro;

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
          ? `You've reached the maximum of ${maxStores} saved stores (iOS geofence limit).`
          : `You've reached the free limit of ${FREE_TIER.maxSavedStores} saved stores. Upgrade to Pro for up to 20 saved stores.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Upgrade to Pro',
                onPress: () => router.push('/paywall'),
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
      radius: canAdjustRadius ? radius : GEOFENCE_DEFAULT_RADIUS});
    router.back();
  };

  const handleRadiusUpsell = () => {
    Alert.alert(
      'Pro Feature',
      'Custom geofence radius is available with GeoCart Pro. Free users use a fixed 100m radius.',
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Upgrade to Pro',
          onPress: () => router.push('/paywall'),
        },
      ]
    );
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
                  onPress={() => router.push('/paywall')}
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

          {/* Radius */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(500)}
            className="mt-5 mb-8"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide">
                Geofence Radius
              </Text>
              {!canAdjustRadius && (
                <Pressable
                  onPress={handleRadiusUpsell}
                  className="flex-row items-center gap-1 bg-[#D4AF37]/10 px-2 py-1 rounded-lg border border-[#D4AF37]/20"
                >
                  <Lock size={10} color="#D4AF37" />
                  <Text className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Pro</Text>
                </Pressable>
              )}
            </View>
            <View
              className="bg-white rounded-2xl p-4 shadow-sm"
              style={!canAdjustRadius ? { opacity: 0.6 } : undefined}
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => {
                    if (!canAdjustRadius) { handleRadiusUpsell(); return; }
                    setRadius(Math.max(50, radius - 50));
                  }}
                  className="w-10 h-10 rounded-xl bg-surface-100 items-center justify-center"
                >
                  <Minus size={18} color={Colors.surface[600]} />
                </Pressable>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-surface-900">
                    {canAdjustRadius ? radius : GEOFENCE_DEFAULT_RADIUS}
                  </Text>
                  <Text className="text-xs text-surface-400">meters{!canAdjustRadius ? ' (fixed)' : ''}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!canAdjustRadius) { handleRadiusUpsell(); return; }
                    setRadius(Math.min(1000, radius + 50));
                  }}
                  className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center"
                >
                  <Plus size={18} color={Colors.primary[500]} />
                </Pressable>
              </View>
              <View className="flex-row justify-between mt-3 px-2">
                {[100, 200, 300, 500].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      if (!canAdjustRadius) { handleRadiusUpsell(); return; }
                      setRadius(r);
                    }}
                    className={`px-3 py-1.5 rounded-lg ${
                      (canAdjustRadius ? radius : GEOFENCE_DEFAULT_RADIUS) === r ? "bg-primary-100" : "bg-surface-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        (canAdjustRadius ? radius : GEOFENCE_DEFAULT_RADIUS) === r ? "text-primary-500" : "text-surface-400"
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
