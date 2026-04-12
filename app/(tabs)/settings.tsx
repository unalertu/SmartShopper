import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Trash2,
  Bell,
  MapPin,
  Info,
  ChevronRight,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useShoppingListStore, useLocationStore } from "@/store";
import { Colors } from "@/constants/theme";

export default function SettingsScreen() {
  const { items, clearPurchased, clearAll } = useShoppingListStore();
  const { locations } = useLocationStore();

  const purchasedCount = items.filter((i) => i.isPurchased).length;

  const handleClearPurchased = () => {
    if (purchasedCount === 0) return;
    Alert.alert(
      "Clear Purchased Items",
      `Remove ${purchasedCount} purchased item${purchasedCount !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearPurchased },
      ]
    );
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    Alert.alert(
      "Clear All Items",
      "This will remove all items from your shopping list. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: clearAll },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-bold text-surface-900">Settings</Text>
      </View>

      <Animated.ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="bg-white rounded-2xl p-5 mb-6 shadow-sm"
          style={{
            shadowColor: Colors.surface[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-4">
            Overview
          </Text>
          <View className="flex-row">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-primary-500">
                {items.length}
              </Text>
              <Text className="text-xs text-surface-400 mt-1">Total Items</Text>
            </View>
            <View className="w-px bg-surface-100" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-green-500">
                {purchasedCount}
              </Text>
              <Text className="text-xs text-surface-400 mt-1">Purchased</Text>
            </View>
            <View className="w-px bg-surface-100" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-accent-500">
                {locations.length}
              </Text>
              <Text className="text-xs text-surface-400 mt-1">Stores</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-3 ml-1">
            Actions
          </Text>

          <SettingsRow
            icon={<Trash2 size={20} color={Colors.warning} />}
            label="Clear Purchased Items"
            sublabel={`${purchasedCount} item${purchasedCount !== 1 ? "s" : ""}`}
            onPress={handleClearPurchased}
          />
          <SettingsRow
            icon={<Trash2 size={20} color={Colors.danger} />}
            label="Clear All Items"
            sublabel={`${items.length} item${items.length !== 1 ? "s" : ""}`}
            onPress={handleClearAll}
            isDanger
          />
        </Animated.View>

        {/* Info */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          className="mt-6"
        >
          <Text className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-3 ml-1">
            About
          </Text>

          <SettingsRow
            icon={<Bell size={20} color={Colors.primary[500]} />}
            label="Notifications"
            sublabel="Get reminded near stores"
          />
          <SettingsRow
            icon={<MapPin size={20} color={Colors.primary[500]} />}
            label="Location Tracking"
            sublabel="Background geofencing"
          />
          <SettingsRow
            icon={<Info size={20} color={Colors.surface[400]} />}
            label="Version"
            sublabel="1.0.0"
          />
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  isDanger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  isDanger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-2 flex-row items-center shadow-sm"
      style={{
        shadowColor: Colors.surface[900],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View className="w-10 h-10 rounded-xl bg-surface-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${isDanger ? "text-red-500" : "text-surface-800"}`}
        >
          {label}
        </Text>
        {sublabel && (
          <Text className="text-sm text-surface-400 mt-0.5">{sublabel}</Text>
        )}
      </View>
      {onPress && (
        <ChevronRight size={18} color={Colors.surface[300]} />
      )}
    </Pressable>
  );
}
