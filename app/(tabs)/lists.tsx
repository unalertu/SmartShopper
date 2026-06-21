import React, { useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native';

import { FREE_TIER, getMaxLists } from '@/constants/tierConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, ChevronRight, Plus, X, ShoppingBasket, Sparkles, ListPlus, PackagePlus, Clock, Activity, CheckCircle, Trash2 } from 'lucide-react-native';
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
  const activityEvents = useActivityStore((state) => state.activities);
  const { templates, incrementUsage } = useQuickStartStore();
  const { isPro } = useSettingsStore();

  const sortedTemplates = [...templates].sort((a, b) => b.usageCount - a.usageCount).map(t => t.name);
  const templateRows = [];
  for (let i = 0; i < sortedTemplates.length; i += 3) {
    templateRows.push(sortedTemplates.slice(i, i + 3));
  }

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
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
              { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
            ]
      );
      return;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateSheet(true);
  }, [canCreateList, isPro, router]);

  const handleCreateList = useCallback((name: string) => {
    addList(name);
  }, [addList]);

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
            layout={LinearTransition.springify()}
            className="flex-row items-center justify-between mx-6 mb-6"
            style={{ zIndex: 10 }}
          >
            <View>
              <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>Lists</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#94a3b8', marginTop: 2, letterSpacing: -0.1 }}>{shoppingLists.length === 0 ? 'No saved lists' : `${shoppingLists.length} saved list${shoppingLists.length !== 1 ? 's' : ''}`}</Text>
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
            <View className="flex-row items-center justify-between mb-3 px-6">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={14} color="#94a3b8" strokeWidth={2} />
                <Text className="text-[14px] font-bold text-slate-500 tracking-wide">Quick Start</Text>
              </View>
              {templateRows.length > 2 ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    setShowAllTemplates(!showAllTemplates);
                  }}
                >
                  <Text className="text-[12px] font-semibold text-slate-400">{showAllTemplates ? 'See Less' : 'See All'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            
            <ScrollView 
              ref={quickStartScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              <View style={{ gap: 8 }}>
                {(() => {
                  const visibleRows = showAllTemplates ? templateRows : templateRows.slice(0, 2);
                  return visibleRows.map((row, rowIndex) => (
                    <Animated.View 
                      key={rowIndex} 
                      className="flex-row" 
                      style={{ gap: 8 }}
                      entering={FadeInDown.delay(rowIndex * 60).duration(300)}
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
                                      { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
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
                  ));
                })()}
              </View>
            </ScrollView>
          </Animated.View>

          {shoppingLists.length === 0 && (
            <Animated.View 
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
            <Animated.View layout={LinearTransition.springify()} className="h-[3px] bg-slate-200 mx-16 mb-5 rounded-full" />
          )}

          <Animated.View layout={LinearTransition.springify()}>
            {shoppingLists.map((list, index) => (
              <Animated.View
                key={list.id}
                layout={LinearTransition.springify()}
                entering={PopIn.delay(index * 80).duration(300)}
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

          {/* Recent Activity Section */}
          {(shoppingLists.length > 0 || activityEvents.length > 0) && (() => {
            const recentEvents = showAllActivities ? activityEvents : activityEvents.slice(0, 5);

            const getActivityIcon = (type: string) => {
              switch (type) {
                case 'list_created':
                  return <ListPlus size={14} color="#10b981" strokeWidth={2.5} />;
                case 'item_added':
                  return <PackagePlus size={14} color="#1e3a8a" strokeWidth={2.5} />;
                case 'item_removed':
                case 'list_removed':
                  return <Trash2 size={14} color="#ef4444" strokeWidth={2.5} />;
                case 'item_completed':
                  return <CheckCircle size={14} color="#10b981" strokeWidth={2.5} />;
                case 'purchased_cleared':
                case 'list_cleared':
                  return <Sparkles size={14} color="#eab308" strokeWidth={2.5} />;
                default:
                  return <Clock size={14} color="#94a3b8" strokeWidth={2} />;
              }
            };

            const getIconBg = (type: string) => {
              switch (type) {
                case 'list_created': return 'bg-emerald-100/60';
                case 'item_added': return 'bg-blue-100/60';
                case 'item_removed':
                case 'list_removed': return 'bg-red-100/60';
                case 'item_completed': return 'bg-emerald-100/60';
                case 'purchased_cleared':
                case 'list_cleared': return 'bg-yellow-100/60';
                default: return 'bg-slate-50/60';
              }
            };

            const groupedEvents: { title: string; data: typeof recentEvents }[] = [];
            recentEvents.forEach(event => {
              const title = getRelativeDate(event.timestamp);
              const group = groupedEvents.find(g => g.title === title);
              if (group) {
                group.data.push(event);
              } else {
                groupedEvents.push({ title, data: [event] });
              }
            });

            return (
              <Animated.View layout={LinearTransition.springify()} className="px-6 mt-6 mb-2">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Activity size={14} color="#94a3b8" strokeWidth={2} />
                    <Text className="text-[14px] font-bold text-slate-500 tracking-wide">Recent Activity</Text>
                  </View>
                  {activityEvents.length > 5 ? (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => {
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                        setShowAllActivities(!showAllActivities);
                      }}
                    >
                      <Text className="text-[12px] font-semibold text-slate-400">{showAllActivities ? 'See Less' : 'See All'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {recentEvents.length === 0 ? (
                  <View className="bg-white rounded-[20px] p-5 border border-slate-100 items-center" >
                    <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mb-2.5">
                      <Clock size={18} color="#cbd5e1" strokeWidth={1.5} />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-400/80 text-center">Your recent actions will appear here</Text>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {groupedEvents.map((group, groupIndex) => (
                      <View key={group.title} style={{ gap: 8 }}>
                        <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                          {group.title}
                        </Text>
                        <View style={{ gap: 6 }}>
                          {group.data.map((event, index) => {
                            const dateObj = new Date(event.timestamp);
                            const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <Animated.View
                                key={event.id}
                                entering={FadeInDown.delay((groupIndex * 5 + index) * 60).duration(300)}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    if (event.listId) {
                                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                                      router.push(`/list/${event.listId}`);
                                    }
                                  }}
                                  className="bg-white rounded-[14px] px-3 py-2.5 flex-row items-center border border-slate-100/60"
                                >
                                  <View className={`w-7 h-7 ${getIconBg(event.type)} rounded-[8px] items-center justify-center mr-2.5`}>
                                    {getActivityIcon(event.type)}
                                  </View>
                                  <View className="flex-1 mr-2">
                                    <Text className="text-[14px] font-bold text-slate-800 tracking-tight" numberOfLines={1}>{event.title}</Text>
                                    <Text className="text-[11.5px] font-medium text-slate-400/80 mt-px" numberOfLines={1}>{event.subtitle}</Text>
                                  </View>
                                  <Text className="text-[10.5px] font-medium text-slate-400/50">{timeStr}</Text>
                                </TouchableOpacity>
                              </Animated.View>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            );
          })()}


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
