import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../services/haptics';
import {
  ChevronLeft,
  Bell,
  BellOff,
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
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useNotificationsStore, AppNotification } from '../store';

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Sample Data ─────────────────────────────────────────────────────────────

// ─── Icon Helper ─────────────────────────────────────────────────────────────

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'store_nearby':
      return <MapPin size={20} color="#22c55e" />;
    case 'list_reminder':
      return <ShoppingBag size={20} color="#3b82f6" />;
    case 'location_permission':
      return <AlertTriangle size={20} color="#f59e0b" />;
    case 'welcome':
      return <Sparkles size={20} color="#8b5cf6" />;
  }
}

function getNotificationIconBg(type: AppNotification['type']) {
  switch (type) {
    case 'store_nearby':
      return 'rgba(34, 197, 94, 0.1)';
    case 'list_reminder':
      return 'rgba(59, 130, 246, 0.1)';
    case 'location_permission':
      return 'rgba(245, 158, 11, 0.1)';
    case 'welcome':
      return 'rgba(139, 92, 246, 0.1)';
  }
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
          <Text className={`text-[15px] ${notification.read ? 'font-medium' : 'font-semibold'} text-slate-900`}>
            {notification.title}
          </Text>
          <Text className="text-[12px] text-slate-400 mt-0.5" numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </View>
      <View className="items-end gap-1.5">
        <Text className="text-[11px] font-medium text-slate-300">{notification.time}</Text>
        {!notification.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#3b82f6',
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Time Group Helper ───────────────────────────────────────────────────────

function groupNotifications(notifications: AppNotification[]) {
  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];

  notifications.forEach((n) => {
    if (n.time.includes('ago') || n.time === 'Just now') {
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
  const { notifications, removeNotification, markAllAsRead, markAsRead } = useNotificationsStore();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleDelete(id)}
    >
      <View style={{ backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', width: 80, height: '100%', borderRadius: 24, marginLeft: 8 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', paddingRight: 16 }}>Delete</Text>
      </View>
    </TouchableOpacity>
  );

  const { today, earlier } = groupNotifications(notifications);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar style="dark" />

      <View style={{ paddingTop: insets.top }} className="px-4 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm ml-2"
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-slate-900 ml-4">Notifications</Text>
        </View>

        <View className="flex-row items-center gap-2 mr-2">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleMarkAllRead}
            className="h-10 w-10 bg-white items-center justify-center rounded-full shadow-sm"
          >
            <CheckCheck size={20} color="#3b82f6" />
          </TouchableOpacity>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => closeAllSwipeables()}
      >

        {/* Subtitle */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(50).springify()}
          className="mx-8 mb-4"
        >
          <Text className="text-[13px] font-medium text-slate-400">
            {notifications.length === 0
              ? 'All caught up!'
              : unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
          </Text>
        </Animated.View>

        {/* Empty State */}
        {notifications.length === 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(100).springify()}
            className="mx-6 mt-8 rounded-[28px] p-8 items-center border border-dashed border-slate-200"
            style={{ backgroundColor: '#f8fafc' }}
          >
            <View className="bg-white border border-slate-100 w-14 h-14 rounded-full items-center justify-center mb-4">
              <BellOff size={24} color="#94a3b8" />
            </View>
            <Text className="text-[16px] font-semibold text-slate-600 tracking-tight">
              No Notifications
            </Text>
            <Text className="text-[14px] font-medium text-slate-400 mt-1.5 text-center px-4">
              We'll notify you when you're near a saved store or when there are updates to your lists.
            </Text>
          </Animated.View>
        )}

        {/* Today Section */}
        {today.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.duration(500).delay(100).springify()}
              className="mx-8 mb-2"
            >
              <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">
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
              <Text className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">
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
