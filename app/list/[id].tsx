import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Keyboard, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FREE_TIER, getMaxItemsPerList } from '@/constants/tierConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreHorizontal, ShoppingBag, CheckCircle, Check, Clock, Trash2, Plus, Mic, ScanBarcode, Minus, AlignLeft, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import { useListsStore, useShoppingListStore, useSettingsStore } from '../../store';
import ConfirmationSheet from '../../components/ConfirmationSheet';
import { Colors } from '@/constants/theme';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';

export default function ListDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Modal visibility handled by BottomSheetModal internally
  const addBottomSheetRef = useRef<BottomSheetModal>(null);
  
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  const [note, setNote] = useState('');
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>(null);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'quick' | 'recent' | 'catalog'>('quick');

  const handleSheetAnimate = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex === -1) {
      Keyboard.dismiss();
    }
  }, []);

  const closeModal = useCallback(() => {
    Keyboard.dismiss();
    addBottomSheetRef.current?.dismiss();
  }, []);

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
  const canAddItemToList = useShoppingListStore((state) => state.canAddItemToList);
  
  const { isPro } = useSettingsStore();

  const completedCount = items.filter(item => item.isPurchased).length;
  const remainingCount = items.length - completedCount;

  useEffect(() => {
    Animated.spring(buttonScale, {
      toValue: newItemText.length > 0 ? 1 : 0.95,
      friction: 6,
      tension: 120,
      useNativeDriver: true}).start();
  }, [newItemText]);

  const categories = ['General', '🍎 Fruits', '🥛 Dairy', '🍞 Bakery', '🥩 Meat', '🧼 Cleaning'];
  const units = ['pcs', 'kg', 'lt', 'pack'];

  const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
    'General': [
      'Milk', 'Eggs', 'Bread', 'Water', 'Chicken', 'Banana', 'Rice', 'Cheese',
      'Butter', 'Pasta', 'Tomatoes', 'Onions', 'Potatoes', 'Coffee', 'Tea',
      'Sugar', 'Salt', 'Olive Oil', 'Flour', 'Yogurt', 'Apples', 'Cereal',
      'Toilet Paper', 'Paper Towels', 'Dish Soap'
    ],
    '🍎 Fruits': [
      'Apple', 'Banana', 'Avocado', 'Strawberry', 'Orange', 'Grapes',
      'Lemon', 'Lime', 'Blueberry', 'Raspberry', 'Blackberry', 'Peach',
      'Plum', 'Cherry', 'Pear', 'Watermelon', 'Cantaloupe', 'Pineapple',
      'Mango', 'Kiwi', 'Pomegranate', 'Grapefruit', 'Papaya'
    ],
    '🥛 Dairy': [
      'Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Eggs',
      'Sour Cream', 'Cottage Cheese', 'Cream Cheese', 'Whipping Cream',
      'Parmesan', 'Cheddar', 'Mozzarella', 'Feta', 'Brie', 'Gouda',
      'Almond Milk', 'Oat Milk', 'Soy Milk', 'Half & Half', 'Margarine'
    ],
    '🍞 Bakery': [
      'Bread', 'Croissant', 'Bagel', 'Muffin', 'Baguette', 'Rolls',
      'Buns', 'Pita', 'Tortillas', 'Donut', 'Cake', 'Cookies',
      'Pie', 'Pastry', 'Sourdough', 'Ciabatta', 'Focaccia', 'Pretzel',
      'English Muffin', 'Crackers', 'Brownie'
    ],
    '🥩 Meat': [
      'Chicken', 'Beef', 'Salmon', 'Turkey', 'Sausage', 'Pork',
      'Bacon', 'Ham', 'Lamb', 'Steak', 'Ground Beef', 'Chicken Breast',
      'Chicken Thighs', 'Shrimp', 'Tuna', 'Cod', 'Tilapia', 'Crab',
      'Lobster', 'Hot Dogs', 'Deli Meat', 'Pepperoni', 'Prosciutto'
    ],
    '🧼 Cleaning': [
      'Dish Soap', 'Sponge', 'Bleach', 'Trash Bags', 'Detergent',
      'Fabric Softener', 'Glass Cleaner', 'All-Purpose Cleaner', 'Toilet Cleaner',
      'Paper Towels', 'Napkins', 'Tissues', 'Broom', 'Mop', 'Dustpan',
      'Disinfectant Wipes', 'Air Freshener', 'Laundry Pods', 'Stain Remover',
      'Hand Soap', 'Rubber Gloves'
    ],
  };

  const recentItems = useMemo(() => {
    const uniqueNames = new Set<string>();
    const recents: string[] = [];
    for (const item of allItems) {
      const lowerName = item.name.trim().toLowerCase();
      if (!uniqueNames.has(lowerName)) {
        uniqueNames.add(lowerName);
        recents.push(item.name.trim());
        if (recents.length >= 20) break;
      }
    }
    return recents;
  }, [allItems]);

  const displayedSuggestions = useMemo(() => {
    if (activeSuggestionTab === 'recent') return recentItems;
    const catItems = CATEGORY_SUGGESTIONS[selectedCategory] || CATEGORY_SUGGESTIONS['General'];
    if (activeSuggestionTab === 'catalog') return catItems;
    return catItems.slice(0, 12); // Quick Tap shows top 12
  }, [activeSuggestionTab, recentItems, selectedCategory]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Reset placeholder index when category or tab changes
  useEffect(() => {
    setPlaceholderIndex(0);
  }, [selectedCategory, activeSuggestionTab]);

  useEffect(() => {
    if (displayedSuggestions.length === 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % displayedSuggestions.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [displayedSuggestions.length]);

  const resetModalState = () => {
    setNewItemText('');
    setQuantity(1);
    setSelectedUnit('pcs');
    setNote('');
    setIsNoteVisible(false);
    setSelectedCategory('General');
    setActiveSuggestionTab('quick');
  };

  const handleAddItem = () => {
    if (newItemText.trim().length === 0) return;
    
    if (!canAddItemToList(listId, isPro)) {
      Alert.alert(
        'Item Limit Reached',
        isPro
          ? `You've reached the maximum of ${getMaxItemsPerList(isPro)} items per list.`
          : `You've reached the free limit of ${FREE_TIER.maxItemsPerList} items per list. Upgrade to Pro for up to 500 items.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => {
                  setIsAddModalVisible(false);
                  router.push('/paywall');
                }
              },
            ]
      );
      return;
    }

    hapticNotification(Haptics.NotificationFeedbackType.Success);
    addItem(listId, {
      name: newItemText.trim(),
      quantity,
      unit: selectedUnit,
      category: selectedCategory});
    closeModal();
  };

  const handleDeleteList = () => {
    setDeleteModalData({
      title: "Delete List?",
      description: "This action cannot be undone. All items in this list will be permanently removed.",
      isDestructive: true,
      confirmLabel: "Delete",
      onConfirm: () => {
        removeList(listId);
        setDeleteModalVisible(false);
        router.back();
      }
    });
    setDeleteModalVisible(true);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    []
  );

  if (!list) return null;

  const isButtonActive = newItemText.trim().length > 0;

  return (
    <View className="flex-1 bg-[#F2F2F7]">
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
          <Trash2 size={20} color="#f87171" strokeWidth={2.5} />
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
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-5 px-4 items-center justify-center" 
            
          >
            <View className="bg-slate-900/5 p-3 rounded-full mb-2">
              <ShoppingBag size={20} color="#0f172a" />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{items.length}</Text>
          </View>

          {/* Card 2 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-5 px-4 items-center justify-center" 
            
          >
            <View className="bg-green-500/10 p-3 rounded-full mb-2">
              <Check size={20} color="#22c55e" strokeWidth={2.5} />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Done</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</Text>
          </View>

          {/* Card 3 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-5 px-4 items-center justify-center" 
            
          >
            <View className="bg-orange-500/10 p-3 rounded-full mb-2">
              <Clock size={20} color="#f97316" />
            </View>
            <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Left</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{remainingCount}</Text>
          </View>
        </View>

        {/* 4. The Shopping Items */}
        <View 
          className="mx-6 bg-white rounded-[24px] border border-slate-100 px-5 py-2 mb-8" 
          
        >
          {items.map((item, index) => (
            <View key={item.id}>
              <View className="flex-row items-center justify-between py-4 bg-white">
                <View className="flex-row items-center gap-4 flex-1">
                  {/* Minimal Checkbox */}
                  <TouchableOpacity 
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
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
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
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
            <View className="py-6 px-4 items-center justify-center">
              <ShoppingBag size={48} color="#94a3b8" strokeWidth={1.5} />
              <Text className="text-slate-500 font-semibold text-[15px] mt-3 text-center">No items yet.{'\n'}Tap the button below to add.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* 5. The Bottom Floating Button */}
      <View 
        className="absolute left-6 right-6 z-50"
        style={{ bottom: insets.bottom > 0 ? insets.bottom + 24 : 40 }}
      >
        <TouchableOpacity 
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            addBottomSheetRef.current?.present();
          }}
          className="bg-slate-900 py-[18px] rounded-full flex-row justify-center items-center shadow-lg"
          
        >
          <Text className="text-white font-extrabold text-[17px] tracking-wide">Add New Item</Text>
        </TouchableOpacity>
      </View>

      <BottomSheetModal
        ref={addBottomSheetRef}
        snapPoints={['85%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={false}
        handleIndicatorStyle={{ width: 48, height: 6, backgroundColor: '#e2e8f0' }}
        backgroundStyle={{ borderRadius: 24 }}
        keyboardBehavior="extend"
        onAnimate={handleSheetAnimate}
        onDismiss={() => {
          resetModalState();
        }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24) + 12 }}>
          {/* Focal Point (Input) */}
          <View className="mb-5 z-10 border-b-2 border-slate-100 pb-3 flex-row items-center">
            <BottomSheetTextInput
              className="flex-1 text-2xl font-bold text-slate-900"
              placeholder="Add item..."
              placeholderTextColor="#94a3b8"
              value={newItemText}
              onChangeText={setNewItemText}
              autoFocus={true}
              cursorColor={Colors.primary[900]}
              selectionColor={Colors.primary[900]}
            />
            <TouchableOpacity 
              onPress={() => {
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                closeModal();
              }} 
              className="ml-3 p-2 bg-slate-100 rounded-full"
            >
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Compact Controls (Quantity, Units, Note) */}
          <View className="mb-6 z-10">
            {/* Section Labels */}
            <View className="flex-row mb-2">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest" style={{ width: 100 }}>Quantity</Text>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unit</Text>
            </View>
            <View className="flex-row items-center relative -mx-6">
              <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ paddingRight: 48, gap: 10 }}>
                {/* Quantity */}
                <View className="bg-slate-100 rounded-full px-3 py-2 flex-row items-center gap-3">
                  <TouchableOpacity onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); setQuantity(prev => Math.max(1, prev - 1)); }}>
                    <Minus size={16} color="#0f172a" strokeWidth={3} />
                  </TouchableOpacity>
                  <Text className="text-base font-bold text-slate-900 min-w-[20px] text-center">{quantity}</Text>
                  <TouchableOpacity onPress={() => { hapticImpact(Haptics.ImpactFeedbackStyle.Light); setQuantity(prev => prev + 1); }}>
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
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
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
              </BottomSheetScrollView>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute right-0 top-0 bottom-0 w-8"
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Collapsible Note Input */}
          {isNoteVisible && (
            <View className="mb-6 z-10">
              <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <BottomSheetTextInput
                  className="text-sm font-medium text-slate-900"
                  placeholder="e.g. Organic only, 2% fat..."
                  placeholderTextColor="#94a3b8"
                  value={note}
                  onChangeText={setNote}
                  multiline={true}
                  autoFocus={true}
                  cursorColor={Colors.primary[900]}
                  selectionColor={Colors.primary[900]}
                />
              </View>
            </View>
          )}

          {/* Categories */}
          <View className="mb-6 -mx-6 z-10 relative">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-6">Category</Text>
            <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="px-6" contentContainerStyle={{ paddingRight: 48, gap: 8 }}>
              {categories.map((cat, index) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat);
                    }}
                    className={`px-3.5 py-[7px] rounded-full border ${isSelected ? 'bg-slate-900 border-slate-900' : 'bg-transparent border-slate-200'}`}
                  >
                    <Text className={`text-[13px] font-semibold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </BottomSheetScrollView>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="absolute right-0 top-0 bottom-0 w-8"
              pointerEvents="none"
            />
          </View>

          {/* Dynamic Quick Add */}
          <View className="z-10 flex-1">
            <View className="flex-row items-center gap-4 mb-3">
              <TouchableOpacity onPress={() => {
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                setActiveSuggestionTab('quick');
              }}>
                <Text className={`text-[11px] font-bold uppercase tracking-widest ${activeSuggestionTab === 'quick' ? 'text-slate-900' : 'text-slate-400'}`}>Quick Tap</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                setActiveSuggestionTab('recent');
              }}>
                <Text className={`text-[11px] font-bold uppercase tracking-widest ${activeSuggestionTab === 'recent' ? 'text-slate-900' : 'text-slate-400'}`}>Recent Items</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                setActiveSuggestionTab('catalog');
              }}>
                <Text className={`text-[11px] font-bold uppercase tracking-widest ${activeSuggestionTab === 'catalog' ? 'text-slate-900' : 'text-slate-400'}`}>Catalog</Text>
              </TouchableOpacity>
            </View>

            <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <View className="flex-row flex-wrap gap-2">
                {displayedSuggestions.map((suggestion, idx) => (
                  <TouchableOpacity 
                    key={`${activeSuggestionTab}-${selectedCategory}-${idx}`}
                    onPress={() => {
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      setNewItemText(suggestion);
                    }}
                    className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-[14px] flex-row items-center"
                  >
                    <Plus size={14} color="#64748b" className="mr-1.5" strokeWidth={3} />
                    <Text className="text-slate-700 font-bold text-[15px]">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
                {displayedSuggestions.length === 0 && activeSuggestionTab === 'recent' && (
                  <Text className="text-slate-400 text-sm italic mt-2">No recent items yet.</Text>
                )}
              </View>
            </BottomSheetScrollView>
          </View>

          {/* Action Button — pinned at bottom */}
          <Animated.View style={{ transform: [{ scale: buttonScale as any }] }} className="z-10 mt-4">
            <TouchableOpacity 
              disabled={!isButtonActive}
              className={`h-16 rounded-[24px] flex-row items-center justify-center shadow-xl ${isButtonActive ? 'bg-slate-900' : 'bg-slate-100'}`}
              onPress={handleAddItem}
            >
              <Plus size={24} color={isButtonActive ? "#ffffff" : "#94a3b8"} strokeWidth={2.5} className="mr-2" />
              <Text className={`font-bold text-lg tracking-wide ${isButtonActive ? 'text-white' : 'text-slate-400'}`} numberOfLines={1}>
                {isButtonActive ? `Add "${newItemText.trim()}"` : 'Add to List'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </BottomSheetView>
      </BottomSheetModal>

      <ConfirmationSheet
        visible={deleteModalVisible}
        data={deleteModalData}
        onDismiss={() => setDeleteModalVisible(false)}
      />
      
    </View>
  );
}
