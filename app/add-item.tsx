import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform} from "react-native";
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
  const [quantity, setQuantity] = useState<number | string>(1);
  const [selectedUnit, setSelectedUnit] = useState("pcs");
  const [selectedCategory, setSelectedCategory] = useState("🛒 General");
  const [isFocused, setIsFocused] = useState(false);

  const suggestedItems = ['Avocado', 'Milk', 'Eggs', 'Bread', 'Water', 'Cheese', 'Chicken', 'Apples', 'Bananas'];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % suggestedItems.length);
    }, 2000); // Change placeholder every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAdd = () => {
    if (!name.trim()) return;

    addItem(1, { // Added dummy listId 1, though this screen seems unused
      name: name.trim(),
      quantity: typeof quantity === 'number' ? quantity : (parseFloat((quantity as string).replace(',', '.')) || 1),
      unit: selectedUnit,
      category: selectedCategory});
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
              className={`flex-row items-center bg-[#f8fafc] rounded-[24px] border h-16 ${
                isFocused ? "border-primary-900" : "border-surface-100"
              }`}
              style={
                isFocused
                  ? {
                    }
                  : undefined
              }
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={suggestedItems[placeholderIndex]}
                placeholderTextColor={Colors.surface[400]}
                autoFocus={false}
                autoCorrect={false}
                spellCheck={false}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-1 px-6 py-0 text-lg text-surface-900 font-semibold h-full"
                cursorColor={Colors.primary[900]}
                selectionColor={Colors.primary[900]}
                style={{ textAlignVertical: "center" }}
              />
              {name.length > 0 && (
                <Pressable
                  onPress={() => setName("")}
                  className="pr-5 h-full justify-center items-center"
                >
                  <View className="bg-surface-200 rounded-full p-1">
                    <X size={14} color={Colors.surface[600]} strokeWidth={2.5} />
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {/* Quantity */}
          <View className="mb-8">
            <Text className="text-[13px] font-bold text-surface-400 uppercase tracking-wider mb-2 ml-1">
              Quantity
            </Text>
            <View className="bg-[#f8fafc] rounded-[24px] p-5 flex-row items-center justify-between border border-surface-100">
              <Pressable
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => {
                  const prevStr = typeof quantity === 'string' ? quantity.replace(',', '.') : quantity.toString();
                  const current = parseFloat(prevStr) || 1;
                  setQuantity(Math.max(1, parseFloat((current - 1).toFixed(2))));
                }}
                className="w-12 h-12 rounded-full bg-white border border-surface-200 items-center justify-center shadow-sm"
              >
                <Minus size={20} color={Colors.surface[700]} />
              </Pressable>
              <TextInput
                value={quantity.toString()}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.,]/g, '');
                  setQuantity(cleaned);
                }}
                keyboardType="decimal-pad"
                className="text-3xl font-bold text-surface-900 tabular-nums tracking-tight text-center min-w-[60px] p-0 m-0"
                style={{ padding: 0, margin: 0, textAlignVertical: 'center' }}
                maxLength={5}
              />
              <Pressable
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={() => {
                  const prevStr = typeof quantity === 'string' ? quantity.replace(',', '.') : quantity.toString();
                  const current = parseFloat(prevStr) || 0;
                  setQuantity(parseFloat((current + 1).toFixed(2)));
                }}
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
                  className={`px-5 py-3 rounded-full border justify-center items-center ${
                    selectedUnit === unit.value
                      ? "bg-primary-500 border-primary-500"
                      : "bg-[#f8fafc] border-surface-100"
                  }`}
                >
                  <Text
                    className={`text-[15px] font-semibold text-center ${
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
