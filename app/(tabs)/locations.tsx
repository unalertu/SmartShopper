import { View, Text, Pressable, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, MapPin, Navigation, Trash2 } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLocationStore } from "@/store";
import { Colors } from "@/constants/theme";
import AnimatedScreen from '../../components/AnimatedScreen';

export default function LocationsScreen() {
  const router = useRouter();
  const { locations, toggleActive, removeLocation } = useLocationStore();

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Remove Store",
      `Are you sure you want to remove "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeLocation(id),
        },
      ]
    );
  };

  return (
    <AnimatedScreen>
    <SafeAreaView className="flex-1 bg-surface-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-surface-900">
          Saved Stores
        </Text>
        <Text className="text-base text-surface-400 mt-1">
          {locations.filter((l) => l.isActive).length} active geofence
          {locations.filter((l) => l.isActive).length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Content */}
      <Animated.ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {locations.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            className="items-center justify-center pt-20"
          >
            <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
              <Navigation size={36} color={Colors.primary[500]} />
            </View>
            <Text className="text-xl font-semibold text-surface-700 mb-2">
              No stores saved
            </Text>
            <Text className="text-base text-surface-400 text-center px-8">
              Add your favorite grocery stores to get reminded when you're near them
            </Text>
          </Animated.View>
        ) : (
          locations.map((location, index) => (
            <Animated.View
              key={location.id}
              entering={FadeInDown.duration(400).delay(index * 60)}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
              style={{
                shadowColor: Colors.surface[900],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                  style={{
                    backgroundColor: location.isActive
                      ? Colors.primary[100]
                      : Colors.surface[100],
                  }}
                >
                  <MapPin
                    size={24}
                    color={
                      location.isActive
                        ? Colors.primary[500]
                        : Colors.surface[400]
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-surface-800">
                    {location.name}
                  </Text>
                  <Text
                    className="text-sm text-surface-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {location.address || "No address"}
                  </Text>
                  <Text className="text-xs text-surface-300 mt-1">
                    Radius: {location.radius}m
                  </Text>
                </View>
                <View className="items-end gap-2">
                  <Switch
                    value={location.isActive}
                    onValueChange={() => toggleActive(location.id)}
                    trackColor={{
                      false: Colors.surface[200],
                      true: Colors.primary[200],
                    }}
                    thumbColor={
                      location.isActive
                        ? Colors.primary[500]
                        : Colors.surface[400]
                    }
                  />
                  <Pressable
                    onPress={() => handleDelete(location.id, location.name)}
                    className="p-1"
                  >
                    <Trash2 size={16} color={Colors.surface[300]} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/add-location")}
        className="absolute bottom-28 right-6 w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg"
        style={{
          shadowColor: Colors.primary[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
    </AnimatedScreen>
  );
}
