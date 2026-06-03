import React, { useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, ChevronRight, Plus, X, ShoppingBasket, Sparkles, ListPlus, PackagePlus, Clock, Activity } from 'lucide-react-native';
import AnimatedScreen from '../../components/AnimatedScreen';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification, hapticSelection } from '../../services/haptics';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutLeft, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useListsStore, useShoppingListStore, useQuickStartStore } from '../../store';
import { useScrollToTop } from '@react-navigation/native';
import CreateListSheet from '../../components/CreateListSheet';

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
  const quickStartScrollRef = useRef<ScrollView>(null);
  
  const mergedScrollRef = useRef({
    scrollTo: (options: any) => {
      scrollRef.current?.scrollTo(options);
      quickStartScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    }
  });
  useScrollToTop(mergedScrollRef);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lists: shoppingLists, addList, removeList } = useListsStore();
  const { templates, incrementUsage } = useQuickStartStore();

  const sortedTemplates = [...templates].sort((a, b) => b.usageCount - a.usageCount).map(t => t.name);
  const templateRows = [];
  for (let i = 0; i < sortedTemplates.length; i += 3) {
    templateRows.push(sortedTemplates.slice(i, i + 3));
  }

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const handlePresentModalPress = useCallback(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateSheet(true);
  }, []);

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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
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
      <View className="flex-1 bg-[#F2F2F7]">
        <StatusBar style="dark" />
        
        <ScrollView 
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150, paddingTop: insets.top + 8 }} 
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => closeAllSwipeables()}
        >
          {/* Header */}
          <Animated.View
            layout={LinearTransition.springify()}
            className="flex-row items-center justify-between mx-6 mb-6"
            style={{ zIndex: 10 }}
          >
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: '#0f172a' }}>Lists</Text>
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

          {shoppingLists.length === 0 && (
            <Animated.View 
              layout={LinearTransition.springify()} 
              exiting={FadeOutUp.duration(200)}
              className="mt-2 flex-1"
            >
              {/* Empty State Hero */}
              <View className="items-center justify-center py-6">
                <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-5 border-[6px] border-white"
                  
                >
                  <ShoppingBasket size={36} color="#0f172a" strokeWidth={1.5} />
                </View>
                <Text className="text-[22px] font-bold text-slate-900 tracking-tight mb-2">No lists yet?</Text>
                <Text className="text-[15px] font-medium text-slate-500 text-center px-10 leading-6">
                  Create your first list and we'll notify you when you are at the supermarket.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Quick Start Section */}
          <Animated.View layout={LinearTransition.springify()} className={`${shoppingLists.length === 0 ? 'mt-4' : 'mb-6'}`}>
            <View className="flex-row items-center justify-between mb-3 px-6">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={14} color="#94a3b8" strokeWidth={2} />
                <Text className="text-[14px] font-bold text-slate-500 tracking-wide uppercase">Quick Start</Text>
              </View>
              {templateRows.length > 2 ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    setShowAllTemplates(!showAllTemplates);
                  }}
                >
                  <Text className="text-[12px] font-semibold text-slate-400">{showAllTemplates ? 'Show Less' : 'See All'}</Text>
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
                    <View key={rowIndex} className="flex-row" style={{ gap: 8 }}>
                      {row.map((template) => (
                        <TouchableOpacity
                          key={template}
                          activeOpacity={0.7}
                          onPress={() => {
                            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                            addList(template);
                            incrementUsage(template);
                          }}
                          className="bg-white border border-slate-100/70 rounded-[12px] px-3.5 py-2 flex-row items-center gap-1.5"
                          
                        >
                          <Plus size={13} color="#94a3b8" strokeWidth={2.5} />
                          <Text className="text-[13px] font-medium text-slate-600">{template}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ));
                })()}
              </View>
            </ScrollView>
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
                      onPress={() => { closeAllSwipeables(); hapticImpact(Haptics.ImpactFeedbackStyle.Light); router.push(`/list/${list.id}`); }}
                      className="bg-white rounded-[24px] py-3.5 px-4 flex-row items-center justify-between border border-slate-100"
                      
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

          {/* Recent Activity Section */}
          {(() => {
            // Build activity events from lists and items
            const activityEvents: Array<{
              id: string;
              type: 'list_created' | 'item_added' | 'list_updated';
              title: string;
              subtitle: string;
              timestamp: number;
              listId?: number;
            }> = [];

            // Add list creation events
            shoppingLists.forEach((list) => {
              if (list.createdAt) {
                activityEvents.push({
                  id: `list_${list.id}`,
                  type: 'list_created',
                  title: list.name,
                  subtitle: 'List created',
                  timestamp: list.createdAt,
                  listId: list.id});
              }
            });

            // Add item events from shopping list store
            const allItems = useShoppingListStore.getState().items;
            allItems.slice(0, 10).forEach((item) => {
              const parentList = shoppingLists.find(l => l.id === item.listId);
              activityEvents.push({
                id: `item_${item.id}`,
                type: 'item_added',
                title: item.name,
                subtitle: parentList ? `Added to ${parentList.name}` : 'Item added',
                timestamp: item.createdAt,
                listId: item.listId});
            });

            // Sort by most recent first and take top 6
            activityEvents.sort((a, b) => b.timestamp - a.timestamp);
            const recentEvents = activityEvents.slice(0, 6);

            const getActivityIcon = (type: string) => {
              switch (type) {
                case 'list_created':
                  return <ListPlus size={14} color="#334155" strokeWidth={2} />;
                case 'item_added':
                  return <PackagePlus size={14} color="#475569" strokeWidth={2} />;
                default:
                  return <Clock size={14} color="#94a3b8" strokeWidth={2} />;
              }
            };

            const getIconBg = (type: string) => {
              switch (type) {
                case 'list_created': return 'bg-slate-100/70';
                case 'item_added': return 'bg-slate-100/50';
                default: return 'bg-slate-50/60';
              }
            };

            return (
              <Animated.View layout={LinearTransition.springify()} className="px-6 mt-6 mb-2">
                <View className="flex-row items-center gap-1.5 mb-3">
                  <Activity size={14} color="#94a3b8" strokeWidth={2} />
                  <Text className="text-[14px] font-bold text-slate-500 tracking-wide uppercase">Recent Activity</Text>
                </View>

                {recentEvents.length === 0 ? (
                  <View className="bg-white rounded-[20px] p-5 border border-slate-100 items-center" >
                    <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mb-2.5">
                      <Clock size={18} color="#cbd5e1" strokeWidth={1.5} />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-400/80 text-center">Your recent actions will appear here</Text>
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    {recentEvents.map((event, index) => (
                      <Animated.View
                        key={event.id}
                        entering={FadeInDown.delay(index * 60).duration(300)}
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
                          <Text className="text-[10.5px] font-medium text-slate-400/50">{getRelativeDate(event.timestamp)}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                )}
              </Animated.View>
            );
          })()}

          <Animated.View layout={LinearTransition.springify()} className="mx-6 mt-5 mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePresentModalPress}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8}}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 }}>Create New List</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Bottom Sheet for Adding New List */}
        <CreateListSheet
          visible={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          onCreateList={handleCreateList}
        />
      </View>
    </AnimatedScreen>
  );
}
