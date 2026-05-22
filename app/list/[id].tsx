import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Platform, Animated, Keyboard, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreHorizontal, ShoppingBag, CheckCircle, Check, Clock, Trash2, Plus, Mic, ScanBarcode, Minus, AlignLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useListsStore, useShoppingListStore } from '../../store';

export default function ListDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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

  // Stores
  const listId = Number(id);
  const list = useListsStore((state) => state.lists.find((l) => l.id === listId));
  const removeList = useListsStore((state) => state.removeList);
  
  const allItems = useShoppingListStore((state) => state.items);
  const items = useMemo(() => allItems.filter(item => item.listId === listId), [allItems, listId]);
  
  const addItem = useShoppingListStore((state) => state.addItem);
  const togglePurchased = useShoppingListStore((state) => state.togglePurchased);
  const removeItem = useShoppingListStore((state) => state.removeItem);

  const completedCount = items.filter(item => item.isPurchased).length;
  const remainingCount = items.length - completedCount;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(listId, {
      name: newItemText.trim(),
      quantity,
      unit: selectedUnit,
      category: selectedCategory,
    });
    resetModalState();
    setIsAddModalVisible(false);
  };

  const handleDeleteList = () => {
    Alert.alert(
      "Delete List",
      "Are you sure you want to delete this list?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            removeList(listId);
            router.back();
          }
        }
      ]
    );
  };

  if (!list) return null;

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
        <View className="flex-1 items-center px-4">
          <Text 
            className="text-[24px] font-bold text-slate-900 tracking-tight" 
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {list.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDeleteList} className="bg-slate-100 p-3 rounded-full">
          <Trash2 size={20} color="#ef4444" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* 3. Bento Grid Stats */}
        <View className="flex-row mx-6 gap-3 mb-8">
          {/* Card 1 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-6 px-4 items-center justify-center" 
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 3 }}
          >
            <View className="bg-slate-900/5 p-3 rounded-full mb-4">
              <ShoppingBag size={20} color="#0f172a" />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{items.length}</Text>
          </View>

          {/* Card 2 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-6 px-4 items-center justify-center" 
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 3 }}
          >
            <View className="bg-slate-900/5 p-3 rounded-full mb-4">
              <Check size={20} color="#0f172a" strokeWidth={2.5} />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Done</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{completedCount}</Text>
          </View>

          {/* Card 3 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-6 px-4 items-center justify-center" 
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 3 }}
          >
            <View className="bg-slate-900/5 p-3 rounded-full mb-4">
              <Clock size={20} color="#0f172a" />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Left</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{remainingCount}</Text>
          </View>
        </View>

        {/* 4. The Shopping Items */}
        <View 
          className="mx-6 bg-white rounded-[24px] border border-slate-100 px-5 py-2 mb-8" 
          style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 3 }}
        >
          {items.map((item, index) => (
            <View key={item.id}>
              <View className="flex-row items-center justify-between py-4 bg-white">
                <View className="flex-row items-center gap-4 flex-1">
                  {/* Minimal Checkbox */}
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      togglePurchased(item.id);
                    }}
                    className="justify-center items-center w-8 h-8"
                  >
                    {item.isPurchased ? (
                      <Check size={24} color="#0f172a" strokeWidth={3} />
                    ) : (
                      <View className="w-6 h-6 rounded-full border-[2px] border-slate-300" />
                    )}
                  </TouchableOpacity>
                  
                  {/* Item Text */}
                  <View className="flex-1">
                    <Text 
                      className={`text-[16px] font-bold ${
                        item.isPurchased ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-[13px] text-slate-400 font-medium mt-0.5">
                      {item.quantity} {item.unit} {item.category !== 'General' ? `• ${item.category}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Right Action */}
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeItem(item.id);
                  }}
                  className="p-2"
                >
                  <Trash2 size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              {/* Divider (hide for last item) */}
              {index < items.length - 1 && (
                <View className="h-[1px] bg-slate-50 ml-10 mr-2" />
              )}
            </View>
          ))}
          {items.length === 0 && (
            <View className="p-8 items-center justify-center">
              <ShoppingBag size={48} color="#cbd5e1" strokeWidth={1.5} />
              <Text className="text-slate-400 font-semibold text-[15px] mt-4 text-center">No items yet.{'\n'}Tap the button below to add.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* 5. The Bottom Floating Button */}
      <View 
        className="absolute left-6 right-6 z-50"
        style={{ bottom: insets.bottom > 0 ? insets.bottom + 16 : 40 }}
      >
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsAddModalVisible(true);
          }}
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
            <View className="bg-white w-full h-[85%] rounded-t-[24px] px-6 pt-6 flex-col" style={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View className="flex-1">
              {/* Drag Handle */}
              <View className="items-center mb-4 z-10">
                <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </View>
              
              {/* Focal Point (Input) */}
              <View className="mb-5 z-10 border-b-2 border-slate-100 pb-3 flex-row items-center">
                <TextInput
                  className="flex-1 text-4xl font-extrabold text-slate-900"
                  placeholder="e.g. Avocado"
                  placeholderTextColor="#cbd5e1"
                  value={newItemText}
                  onChangeText={setNewItemText}
                  autoFocus={true}
                />
                <TouchableOpacity className="p-3 bg-slate-100 rounded-full ml-2">
                  <Mic size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              {/* Compact Controls (Quantity, Units, Note) */}
              <View className="flex-row items-center mb-6 z-10">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6" contentContainerStyle={{ paddingRight: 48, gap: 10 }}>
                  {/* Quantity */}
                  <View className="bg-slate-100 rounded-full px-3 py-2 flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(prev => Math.max(1, prev - 1)); }}>
                      <Minus size={16} color="#0f172a" strokeWidth={3} />
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-slate-900 min-w-[20px] text-center">{quantity}</Text>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(prev => prev + 1); }}>
                      <Plus size={16} color="#0f172a" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>

                  {/* Units */}
                  {units.map((unit) => {
                    const isSelected = selectedUnit === unit;
                    return (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedUnit(unit);
                        }}
                        className={`px-4 py-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{unit}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add Note Button */}
                  <TouchableOpacity 
                    onPress={() => setIsNoteVisible(!isNoteVisible)} 
                    className={`px-4 py-2 rounded-full flex-row items-center ${isNoteVisible ? 'bg-slate-900' : 'bg-slate-100'}`}
                  >
                    <AlignLeft size={16} color={isNoteVisible ? "#ffffff" : "#64748b"} />
                    <Text className={`text-sm font-bold ml-1.5 ${isNoteVisible ? 'text-white' : 'text-slate-600'}`}>Note</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Collapsible Note Input */}
              {isNoteVisible && (
                <View className="mb-6 z-10">
                  <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <TextInput
                      className="text-sm font-medium text-slate-900"
                      placeholder="e.g. Organic only, 2% fat..."
                      placeholderTextColor="#94a3b8"
                      value={note}
                      onChangeText={setNote}
                      multiline={true}
                      autoFocus={true}
                    />
                  </View>
                </View>
              )}

              {/* Categories */}
              <View className="mb-6 -mx-6 z-10">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="px-6" contentContainerStyle={{ paddingRight: 48, gap: 8 }}>
                  {categories.map((cat, index) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity 
                        key={index}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCategory(cat);
                        }}
                        className={`px-4 py-2 rounded-xl border ${isSelected ? 'bg-slate-900 border-slate-900' : 'bg-transparent border-slate-200'}`}
                      >
                        <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Dynamic Quick Add */}
              <View className="z-10 flex-1">
                <Text className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Quick Tap</Text>
                <View className="flex-row flex-wrap gap-2">
                  {suggestedItems.map((suggestion, idx) => (
                    <TouchableOpacity 
                      key={idx}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewItemText(suggestion);
                      }}
                      className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-[14px] flex-row items-center"
                    >
                      <Plus size={14} color="#64748b" className="mr-1.5" strokeWidth={3} />
                      <Text className="text-slate-700 font-bold text-[15px]">{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Button — pinned at bottom */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="z-10 mt-4">
                <TouchableOpacity 
                  disabled={!isButtonActive}
                  className={`h-16 rounded-[24px] flex-row items-center justify-center shadow-xl ${isButtonActive ? 'bg-slate-900' : 'bg-slate-100'}`}
                  onPress={handleAddItem}
                >
                  <Plus size={24} color={isButtonActive ? "#ffffff" : "#94a3b8"} strokeWidth={2.5} className="mr-2" />
                  <Text className={`font-bold text-lg tracking-wide ${isButtonActive ? 'text-white' : 'text-slate-400'}`}>Add to List</Text>
                </TouchableOpacity>
              </Animated.View>
              </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
    </View>
  );
}
