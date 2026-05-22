import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Minus, Plus, Check } from "lucide-react-native";
import { useShoppingListStore } from "@/store";
import { CATEGORIES, UNITS } from "@/constants";
import { Colors } from "@/constants/theme";

export default function AddItemScreen() {
  const router = useRouter();
  const addItem = useShoppingListStore((s) => s.addItem);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState("pcs");
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [isFocused, setIsFocused] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;

    addItem(1, { // Added dummy listId 1, though this screen seems unused
      name: name.trim(),
      quantity,
      unit: selectedUnit,
      category: selectedCategory,
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-12 h-12 rounded-full bg-surface-50 items-center justify-center border border-surface-100 shadow-sm"
          >
            <X size={22} color={Colors.surface[700]} />
          </Pressable>
          <Text className="text-xl font-bold text-surface-900 tracking-tight">Add Item</Text>
          {/* Temporarily hidden Add button */}
          <Pressable
            disabled={true}
            className="w-12 h-12 opacity-0"
          >
            <Check size={22} color={Colors.surface[400]} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Item Name */}
          <View className="mb-8 z-10">
            <Text className="text-[13px] font-bold text-surface-400 uppercase tracking-wider mb-2 ml-1">
              Item Name
            </Text>
            <View
              className={`flex-row items-center bg-[#f8fafc] rounded-[24px] border ${
                isFocused ? "border-primary-400" : "border-surface-100"
              }`}
              style={
                isFocused
                  ? {
                      shadowColor: Colors.primary[500],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      elevation: 4,
                    }
                  : undefined
              }
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Organic Milk"
                placeholderTextColor={Colors.surface[400]}
                autoFocus={false}
                autoCorrect={false}
                spellCheck={false}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-1 px-6 py-5 text-lg text-surface-900 font-semibold"
              />
            </View>
          </View>

          {/* Quantity */}
          <View className="mb-8">
            <Text className="text-[13px] font-bold text-surface-400 uppercase tracking-wider mb-2 ml-1">
              Quantity
            </Text>
            <View className="bg-[#f8fafc] rounded-[24px] p-5 flex-row items-center justify-between border border-surface-100">
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-full bg-white border border-surface-200 items-center justify-center shadow-sm"
              >
                <Minus size={20} color={Colors.surface[700]} />
              </Pressable>
              <Text className="text-3xl font-bold text-surface-900 tabular-nums tracking-tight">
                {quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-full bg-primary-50 items-center justify-center border border-primary-100 shadow-sm"
              >
                <Plus size={20} color={Colors.primary[600]} />
              </Pressable>
            </View>
          </View>

          {/* Unit */}
          <View className="mb-8">
            <Text className="text-[13px] font-bold text-surface-400 uppercase tracking-wider mb-2 ml-1">
              Unit Format
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {UNITS.map((unit) => (
                <Pressable
                  key={unit.value}
                  onPress={() => setSelectedUnit(unit.value)}
                  className={`px-5 py-3 rounded-full border ${
                    selectedUnit === unit.value
                      ? "bg-primary-500 border-primary-500"
                      : "bg-[#f8fafc] border-surface-100"
                  }`}
                >
                  <Text
                    className={`text-[15px] font-semibold ${
                      selectedUnit === unit.value ? "text-white" : "text-surface-600"
                    }`}
                  >
                    {unit.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Category */}
          <View className="mb-10">
            <Text className="text-[13px] font-bold text-surface-400 uppercase tracking-wider mb-2 ml-1">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-3 rounded-full flex-row items-center border ${
                    selectedCategory === cat.value
                      ? "bg-surface-900 border-surface-900"
                      : "bg-[#f8fafc] border-surface-100"
                  }`}
                >
                  <Text className="mr-2 text-base">{cat.icon}</Text>
                  <Text
                    className={`text-[15px] font-semibold ${
                      selectedCategory === cat.value ? "text-white" : "text-surface-600"
                    }`}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          
          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
