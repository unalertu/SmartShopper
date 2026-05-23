import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, ChevronRight, Plus, X, ShoppingBasket, Sparkles } from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutLeft, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useListsStore } from '../../store';
import { useScrollToTop } from '@react-navigation/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';

const getRelativeDate = (timestamp?: number): string => {
  if (!timestamp) return 'today';
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

export default function ListsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lists: shoppingLists, addList, removeList } = useListsStore();

  const newListBottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['35%'], []);
  const [newListName, setNewListName] = useState('');

  const handlePresentModalPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    newListBottomSheetRef.current?.present();
  }, []);

  const handleCloseModalPress = useCallback(() => {
    newListBottomSheetRef.current?.dismiss();
    setNewListName('');
  }, []);

  const handleAddList = () => {
    if (newListName.trim()) {
      addList(newListName.trim());
      setNewListName('');
      newListBottomSheetRef.current?.dismiss();
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  const closeAllSwipeables = (exceptId?: number) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  };

  const renderRightActions = (listId: number) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeList(listId);
          swipeableRefs.current.delete(listId);
        }}
      >
        <View style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', paddingRight: 16 }}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedScreen>
      <View className="flex-1 bg-slate-50">
        <StatusBar style="dark" />
        
        <ScrollView 
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 16 }} 
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => closeAllSwipeables()}
        >
          <Animated.View layout={LinearTransition.springify()} className="flex-row items-center mx-6 mb-4 mt-2">
            <View className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2.5" />
            <Text className="text-[22px] font-extrabold tracking-tight text-slate-900">My Lists</Text>
          </Animated.View>

          {shoppingLists.length === 0 && (
            <Animated.View 
              layout={LinearTransition.springify()} 
              exiting={FadeOutUp.duration(200)}
              className="mt-2 flex-1"
            >
              {/* Empty State Hero */}
              <View className="items-center justify-center py-6">
                <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-5 border-[6px] border-white"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.05,
                    shadowRadius: 16,
                    elevation: 2,
                  }}
                >
                  <ShoppingBasket size={36} color="#0f172a" strokeWidth={1.5} />
                </View>
                <Text className="text-[22px] font-bold text-slate-900 tracking-tight mb-2">No lists yet?</Text>
                <Text className="text-[15px] font-medium text-slate-500 text-center px-10 leading-6">
                  Create your first grocery list and start planning your next shopping trip.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Quick Start Section */}
          <Animated.View layout={LinearTransition.springify()} className={`px-6 ${shoppingLists.length === 0 ? 'mt-4' : 'mb-6'}`}>
            <View className="flex-row items-center gap-2 mb-4">
              <Sparkles size={18} color="#0f172a" />
              <Text className="text-[17px] font-bold text-slate-900 tracking-tight">Quick Start</Text>
            </View>
            
            <View className="flex-row flex-wrap gap-3">
              {['Weekly Groceries', 'Breakfast', 'BBQ', 'Cleaning Supplies'].map((template) => (
                <TouchableOpacity
                  key={template}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addList(template);
                  }}
                  className="bg-white border border-slate-100 rounded-[16px] px-4 py-3 flex-row items-center gap-2"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <Plus size={16} color="#0f172a" strokeWidth={2.5} />
                  <Text className="text-[14px] font-semibold text-slate-700">{template}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View layout={LinearTransition.springify()}>
            {shoppingLists.map((list, index) => (
              <Animated.View
                key={list.id}
                layout={LinearTransition.springify()}
                entering={FadeInDown.springify().delay(index * 100)}
                exiting={FadeOutLeft.duration(200)}
              >
                  <Swipeable
                    containerStyle={{ marginHorizontal: 24, marginBottom: 12 }}
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current.set(list.id, ref);
                      } else {
                        swipeableRefs.current.delete(list.id);
                      }
                    }}
                    renderRightActions={() => renderRightActions(list.id)}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                    onSwipeableWillOpen={() => closeAllSwipeables(list.id)}
                  >
                    <TouchableOpacity 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/list/${list.id}`); }}
                      className="bg-white rounded-[24px] py-3.5 px-4 flex-row items-center justify-between border border-slate-100"
                      style={{
                        shadowColor: '#0f172a',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.03,
                        shadowRadius: 24,
                        elevation: 3,
                      }}
                    >
                      <View className="flex-row items-center gap-3.5 flex-1">
                        <View className="w-10 h-10 bg-slate-100/60 rounded-[12px] items-center justify-center">
                          <Menu size={20} color="#475569" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[16px] font-semibold text-slate-900 tracking-tight" numberOfLines={1}>{list.name}</Text>
                          <Text className="text-[13px] font-medium text-slate-500 mt-0.5" numberOfLines={1}>{list.count} items • Updated {getRelativeDate(list.createdAt)}</Text>
                        </View>
                      </View>
                      <ChevronRight size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </Swipeable>
                </Animated.View>
              ))}
          </Animated.View>

          {/* Adaptive Popular Items Placeholder */}
          {shoppingLists.length === 0 ? (
            <Animated.View layout={LinearTransition.springify()} className="px-6 mt-8">
              <Text className="text-[17px] font-bold text-slate-900 tracking-tight mb-4">Popular Items</Text>
              <View className="bg-white rounded-[24px] p-2 border border-slate-100" style={{
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.03,
                shadowRadius: 24,
                elevation: 2,
              }}>
                {[
                  { icon: '🥛', name: 'Milk', category: 'Dairy' },
                  { icon: '🥚', name: 'Eggs', category: 'Dairy' },
                  { icon: '🍞', name: 'Bread', category: 'Bakery' }
                ].map((item, index) => (
                  <View key={item.name} className={`flex-row items-center justify-between p-3 ${index !== 2 ? 'border-b border-slate-50' : ''}`}>
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 bg-slate-50 rounded-[14px] items-center justify-center">
                        <Text className="text-2xl">{item.icon}</Text>
                      </View>
                      <View>
                        <Text className="text-[16px] font-bold text-slate-900">{item.name}</Text>
                        <Text className="text-[13px] font-medium text-slate-500 mt-0.5">{item.category}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      className="w-9 h-9 bg-slate-100 rounded-full items-center justify-center"
                    >
                      <Plus size={18} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : (
            <Animated.View layout={LinearTransition.springify()} className="mt-6 mb-2 px-6">
              <Text className="text-[15px] font-semibold text-slate-500 tracking-tight mb-3">Popular Items</Text>
              <View className="bg-white rounded-[20px] p-2 border border-slate-100" style={{
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.02,
                  shadowRadius: 12,
                  elevation: 1,
              }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, gap: 12 }}>
                  {[
                    { icon: '🥛', name: 'Milk' },
                    { icon: '🥚', name: 'Eggs' },
                    { icon: '🍞', name: 'Bread' },
                    { icon: '🍎', name: 'Apples' },
                    { icon: '🍌', name: 'Bananas' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      activeOpacity={0.7}
                      className="items-center py-3 px-2 w-[72px]"
                    >
                      <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mb-2">
                        <Text className="text-xl">{item.icon}</Text>
                      </View>
                      <Text className="text-[12px] font-semibold text-slate-700 text-center" numberOfLines={1}>{item.name}</Text>
                      <View className="absolute top-2 right-1 w-5 h-5 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100">
                         <Plus size={12} color="#0f172a" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          )}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mt-6 mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePresentModalPress}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 20,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Plus size={22} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>Create New List</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Bottom Sheet for Adding New List */}
        <BottomSheetModal
          ref={newListBottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          backdropComponent={renderBackdrop}
          enablePanDownToClose={true}
          handleIndicatorStyle={{ backgroundColor: '#cbd5e1', width: 40 }}
          backgroundStyle={{ borderRadius: 32 }}
        >
          <View className="flex-1 px-6 pt-2 pb-6 bg-white">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-bold text-slate-900 tracking-tight">Create New List</Text>
              <TouchableOpacity onPress={handleCloseModalPress} className="bg-slate-100 p-2 rounded-full">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <BottomSheetTextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name (e.g., Grocery, Weekly)..."
              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[16px] text-slate-900 mb-6 font-medium"
              placeholderTextColor="#94a3b8"
              autoFocus
              onSubmitEditing={handleAddList}
            />
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleAddList(); }}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create List</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetModal>
      </View>
    </AnimatedScreen>
  );
}
