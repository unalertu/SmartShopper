import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../services/haptics';
import {
  ChevronLeft,
  Bell,
  ShoppingBag,
  AlertTriangle,
  MapPin,
  Sparkles,
  CheckCheck,
  Settings,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useNotificationsStore, AppNotification } from '../store';

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Sample Data ─────────────────────────────────────────────────────────────

// ─── Icon Helper ─────────────────────────────────────────────────────────────

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'location':
      return <MapPin size={20} color="#22c55e" />;
    case 'welcome':
      return <Sparkles size={20} color="#8b5cf6" />;
    case 'reminder':
      return <ShoppingBag size={20} color="#3b82f6" />;
    case 'update':
      return <Sparkles size={20} color="#8b5cf6" />;
  }
}

function getNotificationIconBg(type: AppNotification['type']) {
  switch (type) {
    case 'location':
      return 'rgba(34, 197, 94, 0.1)';
    case 'welcome':
      return 'rgba(139, 92, 246, 0.1)';
    case 'reminder':
      return 'rgba(59, 130, 246, 0.1)';
    case 'update':
      return 'rgba(139, 92, 246, 0.1)';
  }
}

// ─── Time Helper ─────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 1 ? 'now' : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString();
}

// ─── Notification Row ────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onPress,
  isLast,
}: {
  notification: AppNotification;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className={`flex-row items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}
      style={{ opacity: notification.read ? 0.55 : 1 }}
    >
      <View className="flex-row items-center flex-1 pr-4">
        <View
          style={{
            backgroundColor: getNotificationIconBg(notification.type),
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getNotificationIcon(notification.type)}
        </View>
        <View className="ml-3 flex-shrink flex-1">
          <Text className="text-[15px] font-semibold text-slate-900">
            {notification.title}
          </Text>
          <Text className="text-[12px] text-slate-400 mt-0.5" numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: notification.read ? 'transparent' : '#3b82f6',
          }}
        />
        <Text className="text-[11px] font-medium text-slate-400">{formatRelativeTime(notification.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Time Group Helper ───────────────────────────────────────────────────────

function groupNotifications(notifications: AppNotification[]) {
  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  notifications.forEach((n) => {
    const nDate = new Date(n.timestamp);
    const nStr = `${nDate.getFullYear()}-${nDate.getMonth()}-${nDate.getDate()}`;
    
    if (nStr === todayStr) {
      today.push(n);
    } else {
      earlier.push(n);
    }
  });

  return { today, earlier };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, removeNotification, markAllAsRead, markAsRead, syncFromAnalytics } = useNotificationsStore();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  useFocusEffect(
    useCallback(() => {
      syncFromAnalytics().then(() => {
        const { notifications } = useNotificationsStore.getState();
        if (!notifications.find(n => n.id === 'mock_reminder')) {
          useNotificationsStore.setState({
            notifications: [
              {
                id: 'mock_reminder',
                type: 'reminder',
                title: 'Ready for your next trip?',
                body: 'Start a new list before you head to the store.',
                timestamp: Date.now() + 1000,
                read: false,
              },
              ...notifications
            ]
          });
        }
      });
    }, [syncFromAnalytics])
  );


  const unreadCount = notifications.filter((n) => !n.read).length;

  const closeAllSwipeables = (exceptId?: string) => {
    swipeableRefs.current.forEach((ref, id) => {
      if (id !== exceptId) {
        ref.close();
      }
    });
  };

  const handleDelete = useCallback((id: string) => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    removeNotification(id);
    swipeableRefs.current.delete(id);
  }, [removeNotification]);

  const handleMarkAllRead = useCallback(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleTapNotification = useCallback((id: string) => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    markAsRead(id);
  }, [markAsRead]);

  const renderRightActions = (id: string) => (
    <View style={{ width: 88, height: '100%', zIndex: -1, elevation: -1 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}
        onPress={() => handleDelete(id)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const { today, earlier } = groupNotifications(notifications);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar style="dark" />

      <View style={{ paddingTop: insets.top }} className="px-4 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm ml-2"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2 mr-2">
          {unreadCount > 0 && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleMarkAllRead}
                className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm"
              >
                <CheckCheck size={20} color="#3b82f6" />
              </TouchableOpacity>
            </Animated.View>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notification-preferences');
            }}
            className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm"
          >
            <Settings size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => closeAllSwipeables()}
      >

        {/* Large Title */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          className="px-8 mb-6"
        >
          <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.6, color: '#0f172a' }}>Notifications</Text>
        </Animated.View>

        {/* Empty State */}
        {notifications.length === 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(100).springify()}
            className="flex-1"
            style={{ paddingTop: 80 }}
          >
            {/* Empty State Hero */}
            <View className="items-center justify-center py-6">
              <View className="mb-5">
                <Bell size={44} color="#0f172a" strokeWidth={1.8} />
              </View>
              <Text className="text-[22px] font-bold text-slate-900 tracking-tight mb-2">No notifications yet</Text>
              <Text className="text-[15px] font-medium text-slate-500 text-center px-10 leading-6">
                We'll notify you when you're near a saved shop or when there are updates to your lists.
              </Text>
            </View>

            {/* Info Card */}
            <Animated.View
              entering={FadeInDown.duration(500).delay(200).springify()}
              className="bg-white border border-slate-100 rounded-3xl mx-6 mt-2 p-2"
            >
              <View className="px-4 pt-3 pb-2">
                <Text className="text-[15px] font-semibold text-slate-500">What you'll be notified about</Text>
              </View>
              <View className="flex-row items-center p-4 border-b border-slate-50">
                <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color="#22c55e" />
                </View>
                <View className="ml-3 flex-shrink flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900">Nearby Stores</Text>
                  <Text className="text-[12px] text-slate-400 mt-0.5">Get alerted when you're close to a saved shop</Text>
                </View>
              </View>
              <View className="flex-row items-center p-4">
                <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} color="#3b82f6" />
                </View>
                <View className="ml-3 flex-shrink flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900">List Reminders</Text>
                  <Text className="text-[12px] text-slate-400 mt-0.5">Reminders about your shopping lists</Text>
                </View>
              </View>
            </Animated.View>

          </Animated.View>
        )}

        {/* Today Section */}
        {today.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.duration(500).delay(100).springify()}
              className="mx-8 mb-2"
            >
              <Text className="text-[13px] font-semibold text-slate-400 tracking-wide">
                Today
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(500).delay(150).springify()}
              layout={LinearTransition.springify()}
              className="bg-white border border-slate-100 rounded-3xl mx-6 mb-6 p-2"
            >
              {today.map((item, index) => (
                <Animated.View
                  key={item.id}
                  exiting={FadeOutLeft.duration(200)}
                  layout={LinearTransition.springify()}
                >
                  <Swipeable
                    childrenContainerStyle={{ zIndex: 1, elevation: 1 }}
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current.set(item.id, ref);
                      } else {
                        swipeableRefs.current.delete(item.id);
                      }
                    }}
                    renderRightActions={() => renderRightActions(item.id)}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                    onSwipeableWillOpen={() => closeAllSwipeables(item.id)}
                  >
                    <NotificationRow
                      notification={item}
                      onPress={() => handleTapNotification(item.id)}
                      isLast={index === today.length - 1}
                    />
                  </Swipeable>
                </Animated.View>
              ))}
            </Animated.View>
          </>
        )}

        {/* Earlier Section */}
        {earlier.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.duration(500).delay(250).springify()}
              className="mx-8 mb-2"
            >
              <Text className="text-[13px] font-semibold text-slate-400 tracking-wide">
                Earlier
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(500).delay(300).springify()}
              layout={LinearTransition.springify()}
              className="bg-white border border-slate-100 rounded-3xl mx-6 mb-6 p-2"
            >
              {earlier.map((item, index) => (
                <Animated.View
                  key={item.id}
                  exiting={FadeOutLeft.duration(200)}
                  layout={LinearTransition.springify()}
                >
                  <Swipeable
                    childrenContainerStyle={{ zIndex: 1, elevation: 1 }}
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current.set(item.id, ref);
                      } else {
                        swipeableRefs.current.delete(item.id);
                      }
                    }}
                    renderRightActions={() => renderRightActions(item.id)}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                    onSwipeableWillOpen={() => closeAllSwipeables(item.id)}
                  >
                    <NotificationRow
                      notification={item}
                      onPress={() => handleTapNotification(item.id)}
                      isLast={index === earlier.length - 1}
                    />
                  </Swipeable>
                </Animated.View>
              ))}
            </Animated.View>
          </>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(400).springify()}
            layout={LinearTransition.springify()}
            className="items-center mt-2 mb-4"
          >
            <Text className="text-[12px] font-medium text-slate-300 tracking-wide text-center">
              Swipe left to delete
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
