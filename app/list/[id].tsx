import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Platform, Animated } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreHorizontal, ShoppingBag, CheckCircle, Clock, Trash2, Plus, Mic, ScanBarcode, Minus } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function ListDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // Modal visibility
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  
  // Item entry states
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  const [note, setNote] = useState('');
  const [isNoteVisible, setIsNoteVisible] = useState(false);

  // Button scale animation
  const buttonScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.spring(buttonScale, {
      toValue: newItemText.length > 0 ? 1 : 0.95,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [newItemText]);

  const categories = ['General', '🍎 Fruits', '🥛 Dairy', '🍞 Bakery', '🥩 Meat', '🧼 Cleaning'];
  const suggestedItems = ['Milk', 'Eggs', 'Bread', 'Water', 'Cheese', 'Chicken'];
  const units = ['pcs', 'kg', 'lt', 'pack'];

  const dummyItems = [
    { id: 1, name: 'Süt', isCompleted: true },
    { id: 2, name: 'Ekmek', isCompleted: false },
    { id: 3, name: 'Yumurta (15\'li)', isCompleted: false },
    { id: 4, name: 'Zeytin', isCompleted: true },
    { id: 5, name: 'Domates', isCompleted: false },
    { id: 6, name: 'Kaşar Peyniri', isCompleted: false },
  ];

  const resetModalState = () => {
    setNewItemText('');
    setQuantity(1);
    setSelectedUnit('pcs');
    setNote('');
    setIsNoteVisible(false);
    setSelectedCategory('General');
  };

  const handleAddItem = () => {
    if (newItemText.trim().length === 0) return;
    console.log("Adding item:", newItemText, "qty:", quantity, selectedUnit, "category:", selectedCategory, "note:", note);
    resetModalState();
    setIsAddModalVisible(false);
  };

  const isButtonActive = newItemText.trim().length > 0;

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
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. List Title */}
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mx-6 mt-6 mb-6 leading-tight">
          Ahmet için alınacaklar
        </Text>

        {/* 3. Bento Grid Stats */}
        <View className="flex-row mx-6 gap-3 mb-8">
          {/* Card 1 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm items-center justify-center" style={{ elevation: 2 }}>
            <View className="bg-slate-100 p-3 rounded-full mb-3">
              <ShoppingBag size={20} color="#64748b" />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Total Items</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">12</Text>
          </View>

          {/* Card 2 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm items-center justify-center" style={{ elevation: 2 }}>
            <View className="bg-slate-100 p-3 rounded-full mb-3">
              <CheckCircle size={20} color="#10b981" />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Completed</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">4</Text>
          </View>

          {/* Card 3 */}
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm items-center justify-center" style={{ elevation: 2 }}>
            <View className="bg-slate-100 p-3 rounded-full mb-3">
              <Clock size={20} color="#f59e0b" />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Remaining</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">8</Text>
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
          onPress={() => setIsAddModalVisible(true)}
          className="bg-slate-900 py-[18px] rounded-full flex-row justify-center items-center shadow-lg"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}
        >
          <Text className="text-white font-extrabold text-[17px] tracking-wide">Add New Item</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Add Item Modal */}
      <Modal animationType="slide" transparent={true} visible={isAddModalVisible} onRequestClose={() => { resetModalState(); setIsAddModalVisible(false); }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Background Dimmer */}
          <View className="flex-1 justify-end bg-black/40">
            <TouchableWithoutFeedback onPress={() => { resetModalState(); setIsAddModalVisible(false); }}>
              <View className="absolute top-0 left-0 right-0 bottom-0" />
            </TouchableWithoutFeedback>

            {/* The White Bottom Sheet */}
            <View className="bg-white w-full h-[80%] rounded-t-[40px] px-6 pt-6 flex-col" style={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }}>
              {/* Drag Handle & Title */}
              <View className="items-center mb-6 z-10">
                <View className="w-12 h-1.5 bg-slate-200 rounded-full mb-5" />
                <Text className="text-xl font-extrabold text-slate-900 tracking-tight">Add New Item</Text>
              </View>
              
              {/* Categories */}
              <View className="mb-6 -mx-6 z-10">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ paddingRight: 48 }}>
                  {categories.map((cat, index) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity 
                        key={index}
                        onPress={() => setSelectedCategory(cat)}
                        className={`px-5 py-2.5 rounded-full mr-3 ${isSelected ? 'bg-slate-900' : 'bg-slate-100'}`}
                      >
                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              {/* ====== SMART ENTRY AREA ====== */}
              
              {/* Product Name Input with Icons */}
              <View className="mb-5 z-10">
                <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Product Name</Text>
                <View className="flex-row items-center border-b-2 border-slate-100">
                  <TextInput
                    className="flex-1 py-3 text-2xl font-bold text-slate-900"
                    placeholder="e.g. Avocado"
                    placeholderTextColor="#cbd5e1"
                    value={newItemText}
                    onChangeText={setNewItemText}
                  />
                  <TouchableOpacity className="p-2 ml-1">
                    <Mic size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  <TouchableOpacity className="p-2 ml-1">
                    <ScanBarcode size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quantity & Unit Selector Row */}
              <View className="flex-row items-center mb-5 gap-4 z-10">
                {/* Quantity Counter */}
                <View className="bg-slate-100 rounded-full px-4 py-2 flex-row items-center gap-4">
                  <TouchableOpacity onPress={() => setQuantity(prev => Math.max(1, prev - 1))}>
                    <Minus size={18} color="#0f172a" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text className="text-base font-bold text-slate-900 min-w-[20px] text-center">{quantity}</Text>
                  <TouchableOpacity onPress={() => setQuantity(prev => prev + 1)}>
                    <Plus size={18} color="#0f172a" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {/* Unit Chips */}
                <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                  {units.map((unit) => {
                    const isSelected = selectedUnit === unit;
                    return (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setSelectedUnit(unit)}
                        className={`px-4 py-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{unit}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Expandable Notes Area */}
              <View className="mb-2 z-10">
                {!isNoteVisible ? (
                  <TouchableOpacity onPress={() => setIsNoteVisible(true)}>
                    <Text className="text-xs font-semibold text-blue-500">+ Add a note</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Note</Text>
                    <TextInput
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700"
                      placeholder="e.g. Organic only, 2% fat..."
                      placeholderTextColor="#94a3b8"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      autoFocus
                    />
                  </View>
                )}
              </View>

              {/* ====== DIVIDER ====== */}
              <View className="h-[1px] bg-slate-100 w-full mb-6 mt-8 z-10" />

              {/* Smart Suggestions */}
              <View className="flex-1 z-10">
                <Text className="text-sm font-semibold text-slate-400 mb-3">Frequently Added</Text>
                <View className="flex-row flex-wrap gap-2">
                  {suggestedItems.map((suggestion, idx) => (
                    <TouchableOpacity 
                      key={idx}
                      onPress={() => setNewItemText(suggestion)}
                      className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl"
                    >
                      <Text className="text-slate-600 font-medium">{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Button — Dynamic State */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="z-10">
                <TouchableOpacity 
                  disabled={!isButtonActive}
                  className={`h-16 rounded-[32px] flex-row items-center justify-center shadow-xl mt-4 ${isButtonActive ? 'bg-slate-900' : 'bg-slate-900 opacity-30'}`}
                  onPress={handleAddItem}
                >
                  <Plus size={24} color="#ffffff" strokeWidth={2.5} className="mr-2" />
                  <Text className="text-white font-bold text-lg tracking-wide">Add to List</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
    </View>
  );
}
