import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, ChevronRight, Plus, X } from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { useListsStore } from '../../store';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';

const getRelativeDate = (timestamp?: number): string => {
  if (!timestamp) return 'bugün';
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return `${Math.floor(days / 30)} ay önce`;
};

export default function ListsScreen() {
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
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 16 }} 
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => closeAllSwipeables()}
        >
          <View className="px-6 mb-6">
            <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">Lists</Text>
          </View>

          {shoppingLists.length === 0 ? (
            <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-4 mt-4">
              <View
                className="rounded-[24px] p-6 items-center border border-dashed border-slate-200"
                style={{ backgroundColor: '#fafafa' }}
              >
                <View className="bg-slate-100 w-[56px] h-[56px] rounded-full items-center justify-center mb-3">
                  <Menu size={24} color="#cbd5e1" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-400 tracking-tight">No lists yet</Text>
                <Text className="text-[13px] font-medium text-slate-300 mt-1">Tap Add to create a new list</Text>
              </View>
            </Animated.View>
          ) : (
            shoppingLists.map((list) => (
              <Animated.View
                key={list.id}
                layout={LinearTransition.springify()}
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
                    className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-200"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.04,
                      shadowRadius: 16,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-[52px] items-center justify-center">
                        <Menu size={28} color="#334155" />
                      </View>
                      <View>
                        <Text className="text-[16px] font-medium text-slate-900 tracking-tight">{list.name}</Text>
                        <Text className="text-[13px] font-medium text-slate-400 mt-1">{list.count} ürün • Güncellendi {getRelativeDate(list.createdAt)}</Text>
                      </View>
                    </View>
                    <ChevronRight size={24} color="#cbd5e1" />
                  </TouchableOpacity>
                </Swipeable>
              </Animated.View>
            ))
          )}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mb-2 mt-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePresentModalPress}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add List</Text>
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
