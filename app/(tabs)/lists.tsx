import React, { useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native';

import { FREE_TIER, getMaxLists } from '@/constants/tierConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, ChevronRight, Plus, X, ShoppingBasket, Zap } from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutLeft, FadeOutUp, LinearTransition, Keyframe, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ScalePressable = ({ children, onPress, className }: any) => {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.92, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}
      className={className}
      style={style}
    >
      {children}
    </AnimatedPressable>
  );
};

const PopIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 20 }, { scale: 0.95 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
});
import { useTabBarScrollHandler } from '../../hooks/useTabBarScroll';
import { useListsStore, useShoppingListStore, useQuickStartStore, useSettingsStore } from '../../store';
import { useActivityStore } from '../../store/useActivityStore';
import { useScrollToTop } from '@react-navigation/native';
import CreateListSheet from '../../components/CreateListSheet';
import ConfirmationSheet from '../../components/ConfirmationSheet';
import ActivityTimeline from '../../components/ActivityTimeline';
import { showPaywall } from "@/services/paywallService";

const getRelativeDate = (timestamp?: number): string => {
  if (!timestamp) return 'today';
  const date = new Date(timestamp);
  const now = new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = nowOnly.getTime() - dateOnly.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

export default function ListsScreen() {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const quickStartScrollRef = useRef<ScrollView>(null);
  const scrollHandler = useTabBarScrollHandler();
  
  const mergedScrollRef = useRef({
    scrollTo: (options: any) => {
      scrollRef.current?.scrollTo(options);
      quickStartScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    }
  });
  useScrollToTop(mergedScrollRef);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lists: shoppingLists, addList, removeList, canCreateList } = useListsStore();
  const activityCount = useActivityStore((state) => state.activities.length);
  const { templates, incrementUsage } = useQuickStartStore();
  const { isPro } = useSettingsStore();

  const sortedTemplates = [...templates].sort((a, b) => b.usageCount - a.usageCount).map(t => t.name);
  
  const templateRows = [];
  const half = Math.ceil(sortedTemplates.length / 2);
  if (sortedTemplates.length > 0) {
    templateRows.push(sortedTemplates.slice(0, half));
    if (half < sortedTemplates.length) {
      templateRows.push(sortedTemplates.slice(half));
    }
  }

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<any>(null);

  const handlePresentModalPress = useCallback(() => {
    if (!canCreateList(isPro)) {
      Alert.alert(
        'List Limit Reached',
        isPro
          ? `You've reached the maximum of ${getMaxLists(isPro)} shopping lists.`
          : `You've reached the free limit of ${FREE_TIER.maxLists} shopping lists. Upgrade to Pro for unlimited lists.`,
        isPro
          ? [{ text: 'OK' }]
          : [
              { text: 'OK', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => showPaywall() },
            ]
      );
      return;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateSheet(true);
  }, [canCreateList, isPro, router]);

  const handleCreateList = useCallback((name: string) => {
    addList(name);
    incrementUsage(name);
  }, [addList, incrementUsage]);

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
      <View style={{ width: 88, height: '100%' }}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRefs.current.get(listId)?.close();
            setDeleteModalData({
              title: 'Delete List?',
              description: 'This action cannot be undone. All items in this list will be permanently removed.',
              isDestructive: true,
              confirmLabel: 'Delete',
              onConfirm: () => {
                removeList(listId);
                swipeableRefs.current.delete(listId);
              },
              onCancel: () => {
                // swipeable already closed
              }
            });
            setDeleteModalVisible(true);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AnimatedScreen>
      <View className="flex-1 bg-[#F2F2F7]">
        <StatusBar style="dark" />
        
        <Animated.ScrollView 
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8 }} 
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => closeAllSwipeables()}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(200).springify()}
            layout={LinearTransition.springify()}
            className="flex-row items-center justify-between mx-6 mb-6"
            style={{ zIndex: 10 }}
          >
            <View>
              <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>Lists</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePresentModalPress}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={{
                backgroundColor: '#0f172a',
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center'}}
            >
              <Plus size={13} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Start Section */}
          <Animated.View layout={LinearTransition.springify()} className={`${shoppingLists.length === 0 ? 'mb-2' : 'mb-6'}`}>
            <Animated.View entering={FadeInDown.duration(200).delay(50).springify()} className="flex-row items-center justify-between mb-3 px-6">
              <View className="flex-row items-center gap-1.5">
                <Zap size={14} color="#94a3b8" strokeWidth={2} />
                <Text className="text-[14px] font-bold text-slate-500 tracking-wide">Quick Start</Text>
              </View>
            </Animated.View>
            
            <ScrollView 
              ref={quickStartScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              <View style={{ gap: 8 }}>
                {templateRows.map((row, rowIndex) => (
                  <Animated.View 
                    key={rowIndex} 
                    className="flex-row" 
                    style={{ gap: 8 }}
                    entering={FadeInDown.duration(200).delay(75 + rowIndex * 25).springify()}
                    layout={LinearTransition.springify()}
                  >
                    {row.map((template) => (
                        <ScalePressable
                          key={template}
                          onPress={() => {
                            if (!canCreateList(isPro)) {
                              Alert.alert(
                                'List Limit Reached',
                                isPro
                                  ? `You've reached the maximum of ${getMaxLists(isPro)} shopping lists.`
                                  : `You've reached the free limit of ${FREE_TIER.maxLists} shopping lists. Upgrade to Pro for unlimited lists.`,
                                isPro
                                  ? [{ text: 'OK' }]
                                  : [
                                      { text: 'OK', style: 'cancel' },
                                      { text: 'Upgrade to Pro', onPress: () => showPaywall() },
                                    ]
                              );
                              return;
                            }
                            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                            addList(template);
                            incrementUsage(template);
                          }}
                          className="bg-white border border-slate-100/70 rounded-[12px] px-3.5 py-2 flex-row items-center gap-1.5"
                        >
                          <Plus size={13} color="#94a3b8" strokeWidth={2.5} />
                          <Text className="text-[13px] font-medium text-slate-600">{template}</Text>
                        </ScalePressable>
                      ))}
                  </Animated.View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          {shoppingLists.length === 0 && (
            <Animated.View 
              entering={FadeInDown.duration(200).delay(125).springify()}
              layout={LinearTransition.springify()} 
              exiting={FadeOutUp.duration(200)}
              className="mt-12 flex-1"
            >
              {/* Empty State Hero */}
              <View className="items-center justify-center py-6">
                <View className="mb-4 mt-2">
                  <ShoppingBasket size={44} color="#0f172a" strokeWidth={1.8} />
                </View>
                <Text className="text-[22px] font-bold text-slate-900 tracking-tight mb-2">No Lists Yet</Text>
                <Text className="text-[15px] font-medium text-slate-500 text-center px-10 leading-6">
                  Create your first shopping list and get notified when you're nearby.
                </Text>
              </View>
            </Animated.View>
          )}

          {shoppingLists.length > 0 && (
            <Animated.View entering={FadeInDown.duration(200).delay(125).springify()} layout={LinearTransition.springify()} className="h-[3px] bg-slate-200 mx-16 mb-5 rounded-full" />
          )}

          <Animated.View layout={LinearTransition.springify()}>
            {shoppingLists.map((list, index) => (
              <Animated.View
                key={list.id}
                layout={LinearTransition.springify()}
                entering={FadeInDown.duration(200).delay(150 + index * 25).springify()}
                exiting={FadeOutLeft.duration(200)}
              >
                  <Swipeable
                    containerStyle={{ marginHorizontal: 24, marginBottom: 10 }}
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
                      onPress={() => { closeAllSwipeables(); hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.push(`/list/${list.id}`); }}
                      className="bg-white rounded-[22px] flex-row items-center justify-between"
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14}}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View style={{ width: 34, height: 34, backgroundColor: 'rgba(241,245,249,0.6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Menu size={16} color="#475569" />
                        </View>
                        <View className="flex-1">
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', letterSpacing: -0.3 }} numberOfLines={1}>{list.name}</Text>
                            {list.count > 0 && (
                              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>{list.count}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '400', color: '#64748b', marginTop: 2 }} numberOfLines={1}>Updated {getRelativeDate(list.createdAt)}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </Swipeable>
                </Animated.View>
              ))}
          </Animated.View>

          {shoppingLists.length > 0 && (
            <Animated.View entering={FadeInDown.duration(200).delay(175 + shoppingLists.length * 25).springify()} layout={LinearTransition.springify()} style={{ alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#94a3b8', letterSpacing: -0.1 }}>
                {shoppingLists.length} saved list{shoppingLists.length !== 1 ? 's' : ''}
              </Text>
            </Animated.View>
          )}

          {/* Recent Activity Section */}
          {(shoppingLists.length > 0 || activityCount > 0) && (
            <ActivityTimeline />
          )}


        </Animated.ScrollView>

        {/* Bottom Sheet for Adding New List */}
        <CreateListSheet
          visible={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          onCreateList={handleCreateList}
        />

        <ConfirmationSheet
          visible={deleteModalVisible}
          data={deleteModalData}
          onDismiss={() => setDeleteModalVisible(false)}
        />
      </View>
    </AnimatedScreen>
  );
}
