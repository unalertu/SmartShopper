import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Keyboard, Alert, Animated, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FREE_TIER, getMaxItemsPerList } from '@/constants/tierConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreHorizontal, ShoppingBag, CheckCircle, Check, Clock, Trash2, Plus, Mic, ScanBarcode, Minus, AlignLeft, X, Pencil } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import { useListsStore, useShoppingListStore, useSettingsStore } from '../../store';
import ConfirmationSheet from '../../components/ConfirmationSheet';
import RenameListSheet from '../../components/RenameListSheet';
import { Colors } from '@/constants/theme';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { showPaywall } from "@/services/paywallService";

export default function ListDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Modal visibility handled by BottomSheetModal internally
  const addBottomSheetRef = useRef<BottomSheetModal>(null);
  
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('🛒 General');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [selectedUnit, setSelectedUnit] = useState('pcs');
  const [note, setNote] = useState('');
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>(null);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'recent' | 'catalog'>('recent');
  const [renameSheetVisible, setRenameSheetVisible] = useState(false);

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
  const renameList = useListsStore((state) => state.renameList);
  
  const allItems = useShoppingListStore((state) => state.items);
  const items = useMemo(() => allItems.filter(item => item.listId === listId), [allItems, listId]);
  
  const addItem = useShoppingListStore((state) => state.addItem);
  const updateItem = useShoppingListStore((state) => state.updateItem);
  const togglePurchased = useShoppingListStore((state) => state.togglePurchased);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const restoreItem = useShoppingListStore((state) => state.restoreItem);
  const canAddItemToList = useShoppingListStore((state) => state.canAddItemToList);
  
  const { isPro, distanceUnit } = useSettingsStore();

  const [deletedItem, setDeletedItem] = useState<any>(null);
  const hideToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const handleRemoveItem = (item: any) => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    removeItem(item.id);
    setDeletedItem(item);
    
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideToastTimeout.current) {
      clearTimeout(hideToastTimeout.current);
    }
    
    hideToastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setDeletedItem(null);
      });
    }, 4000);
  };

  const handleUndo = () => {
    if (deletedItem) {
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      restoreItem(deletedItem);
      
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setDeletedItem(null);
      });
      
      if (hideToastTimeout.current) {
        clearTimeout(hideToastTimeout.current);
      }
    }
  };

  const completedCount = items.filter(item => item.isPurchased).length;
  const remainingCount = items.length - completedCount;

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      let cat = item.category || '🛒 General';
      if (cat === 'General') cat = '🛒 General';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, typeof items>);
  }, [items]);

  const categories = [
    '🛒 General', '🍎 Fruits', '🥦 Vegetables', '🥛 Dairy', '🍞 Bakery', 
    '🥩 Meat', '🐟 Seafood', '🧂 Pantry', '🥤 Drinks', '🍬 Snacks', 
    '❄️ Frozen', '🧹 Household', '🧴 Personal Care'
  ];

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categories.indexOf(a);
    const indexB = categories.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  useEffect(() => {
    Animated.spring(buttonScale, {
      toValue: newItemText.length > 0 ? 1 : 0.95,
      friction: 6,
      tension: 120,
      useNativeDriver: true}).start();
  }, [newItemText]);

  const units = distanceUnit === 'imperial' ? ['pcs', 'lb', 'oz', 'pack'] : ['pcs', 'kg', 'lt', 'pack'];

  const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
    '🛒 General': [
      'Water', 'Sparkling Water', 'Bread', 'Eggs', 'Milk', 'Butter', 'Cheese', 'Yogurt', 'Rice', 'Pasta', 'Flour', 'Sugar', 'Salt', 'Black Pepper', 'Cooking Oil', 'Olive Oil', 'Vinegar', 'Ketchup', 'Mustard', 'Mayonnaise', 'Soy Sauce', 'Honey', 'Jam', 'Peanut Butter', 'Cereal', 'Oats', 'Coffee', 'Tea', 'Chips', 'Crackers', 'Popcorn', 'Chocolate', 'Candy', 'Cookies', 'Ice Cream', 'Frozen Pizza', 'Frozen Vegetables', 'Paper Towels', 'Toilet Paper', 'Trash Bags', 'Dish Soap', 'Laundry Detergent', 'Sponges', 'Aluminum Foil', 'Plastic Wrap', 'Batteries'
    ],
    '🍎 Fruits': [
      'Apples', 'Bananas', 'Oranges', 'Lemons', 'Limes', 'Grapes', 'Strawberries', 'Blueberries', 'Raspberries', 'Blackberries', 'Cherries', 'Peaches', 'Pears', 'Plums', 'Nectarines', 'Mangoes', 'Pineapple', 'Watermelon', 'Cantaloupe', 'Kiwi', 'Avocados', 'Coconut', 'Papaya', 'Pomegranate', 'Dragon Fruit', 'Figs', 'Dates', 'Apricots', 'Cranberries', 'Passion Fruit', 'Tangerines', 'Clementines', 'Grapefruit'
    ],
    '🥦 Vegetables': [
      'Potatoes', 'Sweet Potatoes', 'Tomatoes', 'Onions', 'Garlic', 'Carrots', 'Cucumbers', 'Bell Peppers', 'Chili Peppers', 'Broccoli', 'Cauliflower', 'Lettuce', 'Spinach', 'Kale', 'Cabbage', 'Celery', 'Mushrooms', 'Zucchini', 'Eggplant', 'Corn', 'Green Beans', 'Peas', 'Asparagus', 'Brussels Sprouts', 'Radishes', 'Beets', 'Pumpkin', 'Leeks', 'Ginger', 'Fresh Herbs'
    ],
    '🥛 Dairy': [
      'Whole Milk', 'Skim Milk', 'Almond Milk', 'Oat Milk', 'Soy Milk', 'Butter', 'Cream Cheese', 'Sour Cream', 'Heavy Cream', 'Cottage Cheese', 'Greek Yogurt', 'Yogurt', 'Cheddar Cheese', 'Mozzarella', 'Parmesan', 'Swiss Cheese', 'Feta', 'Gouda', 'Eggs', 'Whipping Cream'
    ],
    '🍞 Bakery': [
      'White Bread', 'Whole Wheat Bread', 'Baguette', 'Bagels', 'Croissants', 'Hamburger Buns', 'Hot Dog Buns', 'Tortillas', 'Pita Bread', 'Muffins', 'Donuts', 'Cinnamon Rolls', 'Cake', 'Cupcakes', 'Cookies', 'Brownies', 'Pie', 'Puff Pastry'
    ],
    '🥩 Meat': [
      'Chicken Breast', 'Chicken Thighs', 'Ground Beef', 'Beef Steak', 'Beef Roast', 'Pork Chops', 'Bacon', 'Sausage', 'Turkey Breast', 'Ground Turkey', 'Lamb Chops', 'Ham', 'Salami', 'Pepperoni', 'Deli Turkey', 'Deli Ham'
    ],
    '🐟 Seafood': [
      'Salmon', 'Tuna', 'Shrimp', 'Cod', 'Tilapia', 'Sardines', 'Crab', 'Lobster', 'Mussels', 'Scallops', 'Fish Sticks', 'Smoked Salmon'
    ],
    '🥤 Drinks': [
      'Water', 'Sparkling Water', 'Cola', 'Lemon Soda', 'Orange Soda', 'Energy Drink', 'Sports Drink', 'Orange Juice', 'Apple Juice', 'Cranberry Juice', 'Grape Juice', 'Iced Tea', 'Coffee', 'Tea', 'Coconut Water'
    ],
    '🍬 Snacks': [
      'Potato Chips', 'Tortilla Chips', 'Pretzels', 'Popcorn', 'Crackers', 'Trail Mix', 'Mixed Nuts', 'Almonds', 'Cashews', 'Pistachios', 'Peanuts', 'Beef Jerky', 'Protein Bars', 'Granola Bars', 'Chocolate', 'Gummies', 'Candy'
    ],
    '🧂 Pantry': [
      'Rice', 'Pasta', 'Spaghetti', 'Macaroni', 'Flour', 'Sugar', 'Brown Sugar', 'Salt', 'Black Pepper', 'Paprika', 'Garlic Powder', 'Onion Powder', 'Cinnamon', 'Oregano', 'Basil', 'Thyme', 'Curry Powder', 'Chili Powder', 'Cumin', 'Olive Oil', 'Vegetable Oil', 'Vinegar', 'Soy Sauce', 'Pasta Sauce', 'Tomato Paste', 'Canned Tomatoes', 'Beans', 'Lentils', 'Chickpeas'
    ],
    '❄️ Frozen': [
      'Frozen Pizza', 'Frozen Fries', 'Frozen Vegetables', 'Frozen Fruit', 'Ice Cream', 'Frozen Chicken Nuggets', 'Frozen Fish', 'Frozen Burgers', 'Frozen Waffles', 'Frozen Breakfast Sandwiches'
    ],
    '🧹 Household': [
      'Toilet Paper', 'Paper Towels', 'Tissues', 'Trash Bags', 'Dish Soap', 'Dishwasher Pods', 'Laundry Detergent', 'Fabric Softener', 'Bleach', 'Multi-Surface Cleaner', 'Glass Cleaner', 'Bathroom Cleaner', 'Sponges', 'Scrub Brushes', 'Aluminum Foil', 'Plastic Wrap', 'Zip Bags', 'Parchment Paper', 'Light Bulbs', 'Batteries'
    ],
    '🧴 Personal Care': [
      'Shampoo', 'Conditioner', 'Body Wash', 'Soap', 'Toothpaste', 'Toothbrush', 'Dental Floss', 'Mouthwash', 'Deodorant', 'Lotion', 'Sunscreen', 'Shaving Cream', 'Razors', 'Hand Soap', 'Hand Sanitizer', 'Lip Balm', 'Cotton Swabs', 'Facial Tissues'
    ]
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
    const catItems = CATEGORY_SUGGESTIONS[selectedCategory] || CATEGORY_SUGGESTIONS['🛒 General'];
    return catItems;
  }, [activeSuggestionTab, recentItems, selectedCategory]);

  const balancedSuggestions = useMemo(() => {
    const rowWidths = [0, 0, 0, 0];
    const rowAssignments: string[][] = [[], [], [], []];
    
    displayedSuggestions.forEach(item => {
      const estWidth = item.length * 8 + 40;
      let minRow = 0;
      for (let i = 1; i < 4; i++) {
        if (rowWidths[i] < rowWidths[minRow]) {
          minRow = i;
        }
      }
      rowAssignments[minRow].push(item);
      rowWidths[minRow] += estWidth;
    });
    
    return rowAssignments;
  }, [displayedSuggestions]);

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
    setEditingItemId(null);
    setNewItemText('');
    setQuantity(1);
    setSelectedUnit('pcs');
    setNote('');
    setIsNoteVisible(false);
    setSelectedCategory('🛒 General');
    setActiveSuggestionTab('recent');
  };

  const handleAddItem = () => {
    if (newItemText.trim().length === 0) return;
    
    if (editingItemId) {
      updateItem(editingItemId, {
        name: newItemText.trim(),
        quantity: typeof quantity === 'number' ? quantity : (parseInt(quantity as string, 10) || 1),
        unit: selectedUnit,
        category: selectedCategory
      });
      hapticNotification(Haptics.NotificationFeedbackType.Success);
      closeModal();
      return;
    }

    if (!canAddItemToList(listId, isPro)) {
      Alert.alert(
        'Item Limit Reached',
        isPro
          ? `You've reached the maximum of ${getMaxItemsPerList(isPro)} items per list.`
          : `You've reached the free limit of ${FREE_TIER.maxItemsPerList} items per list. Upgrade to Pro for unlimited items.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => {
                  closeModal();
                  showPaywall();
                }
              },
            ]
      );
      return;
    }

    hapticNotification(Haptics.NotificationFeedbackType.Success);
    const newItem = {
      id: Date.now().toString(),
      name: newItemText.trim(),
      quantity: typeof quantity === 'number' ? quantity : (parseFloat((quantity as string).replace(',', '.')) || 1),
      unit: selectedUnit,
      category: selectedCategory,
      isChecked: false
    };
    addItem(listId, newItem);
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
        <TouchableOpacity 
          className="flex-1 flex-row justify-center items-center px-4 gap-1.5"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
            setRenameSheetVisible(true);
          }}
        >
          <Text 
            className="text-[24px] font-bold text-slate-900 tracking-tight text-center" 
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ flexShrink: 1 }}
          >
            {list.name}
          </Text>
          <Pencil size={16} color="#94a3b8" />
        </TouchableOpacity>
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
            <View className="bg-blue-500/10 p-3 rounded-full mb-2">
              <ShoppingBag size={20} color="#3b82f6" />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Total</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{items.length}</Text>
          </View>

          {/* Card 2 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-5 px-4 items-center justify-center" 
            
          >
            <View className="bg-green-500/10 p-3 rounded-full mb-2">
              <Check size={20} color="#22c55e" strokeWidth={2.5} />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Done</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</Text>
          </View>

          {/* Card 3 */}
          <View 
            className="flex-1 bg-white border border-slate-100 rounded-[24px] py-5 px-4 items-center justify-center" 
            
          >
            <View className="bg-orange-500/10 p-3 rounded-full mb-2">
              <Clock size={20} color="#f97316" />
            </View>
            <Text className="text-xs text-slate-500 font-medium">Left</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{remainingCount}</Text>
          </View>
        </View>

        {/* 4. The Shopping Items */}
        <View className="mb-8">
          {sortedCategories.map((category) => (
            <View key={category} className="mb-6">
              <Text className="mx-8 mb-2 text-sm font-bold text-slate-500 tracking-wider">
                {category}
              </Text>
              <View className="mx-6 bg-white rounded-[24px] border border-slate-100 px-5 py-2">
                {groupedItems[category].map((item, index) => (
                  <View key={item.id}>
                    <View className="flex-row items-center justify-between py-4 bg-white">
                      <View className="flex-row items-center gap-4 flex-1 pr-4">
                        {/* Item Text */}
                        <TouchableOpacity 
                          className="flex-1"
                          onPress={() => {
                            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                            setEditingItemId(item.id);
                            setNewItemText(item.name);
                            setQuantity(item.quantity);
                            setSelectedUnit(item.unit || 'pcs');
                            setSelectedCategory(item.category || '🛒 General');
                            addBottomSheetRef.current?.present();
                          }}
                        >
                          <Text 
                            className={`text-[16px] font-bold ${
                              item.isPurchased ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-[13px] text-slate-400 font-medium mt-0.5">
                            {item.quantity} {item.unit}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Right Actions */}
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity 
                          onPress={() => handleRemoveItem(item)}
                          className="p-2"
                        >
                          <Trash2 size={18} color="#cbd5e1" />
                        </TouchableOpacity>

                        {/* Minimal Checkbox */}
                        <TouchableOpacity 
                          onPress={() => {
                            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                            togglePurchased(item.id);
                          }}
                          className="justify-center items-center w-8 h-8"
                          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                        >
                          {item.isPurchased ? (
                            <Check size={24} color="#0f172a" strokeWidth={3} />
                          ) : (
                            <View className="w-6 h-6 rounded-full border-[2px] border-slate-300" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Divider (hide for last item) */}
                    {index < groupedItems[category].length - 1 && (
                      <View className="h-[1px] bg-slate-50 ml-10 mr-2" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
          {items.length === 0 && (
            <View className="mx-6 bg-white rounded-[24px] border border-slate-100 px-5 py-2">
              <View className="py-6 px-4 items-center justify-center">
                <ShoppingBag size={48} color="#94a3b8" strokeWidth={1.5} />
                <Text className="text-slate-500 font-semibold text-[15px] mt-3 text-center">No items yet.{'\n'}Tap the button below to add.</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* 5. The Bottom Floating Button */}
      <View 
        className="absolute left-6 right-6 z-40"
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

      {/* 6. Undo Toast */}
      <Animated.View 
        className="absolute left-6 right-6 z-50 flex-row items-center justify-between bg-slate-800 rounded-2xl px-5 py-3.5 shadow-2xl"
        pointerEvents={deletedItem ? "auto" : "none"}
        style={{ 
          bottom: insets.bottom > 0 ? insets.bottom + 92 : 108,
          opacity: toastOpacity,
          transform: [
            { translateY: toastOpacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
          ]
        }}
      >
        <Text className="text-white font-medium text-[15px]">Item deleted</Text>
        <TouchableOpacity onPress={handleUndo} className="bg-slate-600 px-4 py-2 rounded-xl active:bg-slate-500">
          <Text className="text-white font-extrabold text-[14px] tracking-wide">Undo</Text>
        </TouchableOpacity>
      </Animated.View>

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
        <BottomSheetView style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24) + 12 }}>
              {/* Focal Point (Input) */}
          <View className="mb-5 z-10 flex-row items-center h-14">
            <View className="flex-1 flex-row items-center h-full border-b-2 border-slate-100">
              <BottomSheetTextInput
                className="flex-1 text-2xl font-bold text-slate-900 py-0 h-full"
                placeholder="Add item..."
                placeholderTextColor="#94a3b8"
                value={newItemText}
                onChangeText={setNewItemText}
                autoFocus={true}
                cursorColor={Colors.primary[900]}
                selectionColor={Colors.primary[900]}
                style={{ textAlignVertical: "center" }}
              />
              <TouchableOpacity 
                onPress={() => setNewItemText('')}
                className="ml-2 p-2"
              >
                <X size={18} color={Colors.primary[900]} strokeWidth={3} />
              </TouchableOpacity>
            </View>
            <Animated.View style={{ transform: [{ scale: buttonScale as any }] }}>
              <TouchableOpacity 
                disabled={!isButtonActive}
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  handleAddItem();
                }} 
                className={`ml-4 p-3 rounded-full ${isButtonActive ? 'bg-slate-900' : 'bg-slate-100'}`}
              >
                <Plus size={24} color={isButtonActive ? "#ffffff" : "#94a3b8"} strokeWidth={2.5} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Compact Controls (Quantity, Units, Note) */}
          <View className="mb-6 z-10">
            {/* Section Labels */}
            <View className="flex-row mb-4">
              <Text className="text-[15px] font-bold text-slate-500" style={{ width: 100 }}>Quantity</Text>
            <Text className="text-[15px] font-bold text-slate-500">Unit</Text>
            </View>
            <View className="flex-row items-center relative -mx-6">
              <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ paddingRight: 48, gap: 10 }}>
                {/* Quantity */}
                <View className="bg-slate-100 rounded-full px-6 py-2 justify-center min-w-[70px]">
                  <BottomSheetTextInput
                    value={quantity.toString()}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.,]/g, '');
                      setQuantity(cleaned);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    className="text-lg font-bold text-slate-900 text-center p-0 m-0 min-w-[30px]"
                    style={{ padding: 0, margin: 0, textAlignVertical: 'center', transform: [{ translateY: -2 }] }}
                    maxLength={7}
                  />
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
                      className={`px-4 py-2 rounded-full justify-center items-center ${isSelected ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                      <Text className={`text-sm font-bold text-center ${isSelected ? 'text-white' : 'text-slate-600'}`}>{unit}</Text>
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
              <View className="bg-slate-50 rounded-full px-5 py-3 border border-slate-100">
                <BottomSheetTextInput
                  className="text-lg font-medium text-slate-900"
                  placeholder="Add a note..."
                  placeholderTextColor="#94a3b8"
                  value={note}
                  onChangeText={(text) => setNote(text.replace(/\n/g, ''))}
                  multiline={true}
                  blurOnSubmit={true}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoFocus={true}
                  cursorColor={Colors.primary[900]}
                  selectionColor={Colors.primary[900]}
                />
              </View>
            </View>
          )}

          {/* Categories */}
          <View className="mb-6 -mx-6 z-10 relative">
            <Text className="text-[15px] font-bold text-slate-500 mb-2 px-6">Category</Text>
            <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingLeft: 24, paddingRight: 48 }}>
              <View className="gap-2">
                {[0, 1].map(rowIndex => {
                  const rowItems = categories.filter((_, idx) => idx % 2 === rowIndex);
                  if (rowItems.length === 0) return null;
                  return (
                    <View key={`category-row-${rowIndex}`} className="flex-row gap-2">
                      {rowItems.map((cat, idx) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <TouchableOpacity 
                            key={`category-${rowIndex}-${idx}`}
                            onPress={() => {
                              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedCategory(cat);
                              if (activeSuggestionTab === 'recent') {
                                setActiveSuggestionTab('catalog');
                              }
                            }}
                            className={`px-3.5 py-[7px] rounded-full border ${isSelected ? 'bg-slate-900 border-slate-900' : 'bg-transparent border-slate-200'}`}
                          >
                            <Text className={`text-[13px] font-semibold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{cat}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
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
            <View className="flex-row items-center gap-8 mb-3">
              <TouchableOpacity 
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSuggestionTab('recent');
                }}
                className={`pb-1 border-b ${activeSuggestionTab === 'recent' ? 'border-slate-900' : 'border-transparent'}`}
              >
                <Text className={`text-[15px] font-bold ${activeSuggestionTab === 'recent' ? 'text-slate-900' : 'text-slate-500'}`}>Recent Items</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  setActiveSuggestionTab('catalog');
                }}
                className={`pb-1 border-b ${activeSuggestionTab === 'catalog' ? 'border-slate-900' : 'border-transparent'}`}
              >
                <Text className={`text-[15px] font-bold ${activeSuggestionTab === 'catalog' ? 'text-slate-900' : 'text-slate-500'}`}>Catalog</Text>
              </TouchableOpacity>
            </View>

            <View className="-mx-6 relative">
              <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingLeft: 24, paddingRight: 48, paddingBottom: 16 }}>
                <View className="gap-2">
                  {[0, 1, 2, 3].map(rowIndex => {
                    const rowItems = balancedSuggestions[rowIndex];
                    if (!rowItems || rowItems.length === 0) return null;
                    return (
                      <View key={`${activeSuggestionTab}-${selectedCategory}-row-${rowIndex}`} className="flex-row gap-2">
                        {rowItems.map((suggestion, idx) => (
                          <TouchableOpacity 
                            key={`${activeSuggestionTab}-${selectedCategory}-${rowIndex}-${idx}`}
                            onPress={() => {
                              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                              setNewItemText(suggestion);
                            }}
                            className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-full flex-row items-center"
                          >
                            <Plus size={14} color="#64748b" className="mr-2" strokeWidth={3} />
                            <Text className="text-slate-700 font-bold text-[15px]"> {suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                  {displayedSuggestions.length === 0 && activeSuggestionTab === 'recent' && (
                    <View className="py-2">
                      <Text className="text-slate-400 text-sm italic">No recent items yet.</Text>
                    </View>
                  )}
                </View>
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
            </View>
          </TouchableWithoutFeedback>
        </BottomSheetView>
      </BottomSheetModal>

      <ConfirmationSheet
        visible={deleteModalVisible}
        data={deleteModalData}
        onDismiss={() => setDeleteModalVisible(false)}
      />

      <RenameListSheet
        visible={renameSheetVisible}
        initialName={list.name}
        onClose={() => setRenameSheetVisible(false)}
        onRenameList={(newName) => renameList(listId, newName)}
      />
      
    </View>
  );
}
