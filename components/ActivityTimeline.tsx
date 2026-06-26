import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { History, Clock, ListPlus, PackagePlus, Trash2, CheckCircle, Sparkles, RotateCcw } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '../services/haptics';
import { useActivityStore, groupActivities, type ActivityGroup } from '../store/useActivityStore';
import { useListsStore } from '../store/useListsStore';

const GROUPS_PER_PAGE = 5;

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

/** Returns the appropriate icon for a group */
const getGroupIcon = (group: ActivityGroup) => {
  if (group.isListLevel) {
    // Determine from summary
    const summary = group.summaryLines[0]?.toLowerCase() || '';
    if (summary.includes('created')) return <ListPlus size={14} color="#64748b" strokeWidth={2.5} />;
    if (summary.includes('deleted')) return <Trash2 size={14} color="#64748b" strokeWidth={2.5} />;
    if (summary.includes('cleared')) return <Sparkles size={14} color="#64748b" strokeWidth={2.5} />;
    return <Clock size={14} color="#64748b" strokeWidth={2} />;
  }

  // For item-level groups, pick icon based on dominant action
  const summary = group.summaryLines.join(' ').toLowerCase();
  if (summary.includes('added')) return <PackagePlus size={14} color="#64748b" strokeWidth={2.5} />;
  if (summary.includes('purchased')) return <CheckCircle size={14} color="#64748b" strokeWidth={2.5} />;
  if (summary.includes('removed')) return <Trash2 size={14} color="#64748b" strokeWidth={2.5} />;
  if (summary.includes('restored')) return <RotateCcw size={14} color="#64748b" strokeWidth={2.5} />;
  return <Clock size={14} color="#64748b" strokeWidth={2} />;
};

interface ActivityGroupCardProps {
  group: ActivityGroup;
  index: number;
  baseDelay: number;
}

const ActivityGroupCard = ({ group, index, baseDelay }: ActivityGroupCardProps) => {
  const router = useRouter();
  const lists = useListsStore((state) => state.lists);

  const dateObj = new Date(group.timestamp);
  const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const canNavigate = group.listId != null && lists.some(l => l.id === group.listId);

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(baseDelay + index * 25).springify()}
    >
      <TouchableOpacity
        activeOpacity={canNavigate ? 0.7 : 1}
        onPress={() => {
          if (canNavigate) {
            hapticImpact(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/list/${group.listId}`);
          }
        }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderWidth: 1,
          borderColor: 'rgba(241,245,249,0.6)',
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'rgba(241,245,249,0.6)',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            marginTop: 1,
          }}
        >
          {getGroupIcon(group)}
        </View>

        {/* Content */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#1e293b',
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {group.listName}
          </Text>

          {/* Summary lines */}
          <View style={{ marginTop: 3 }}>
            {group.summaryLines.map((line, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#94a3b8',
                  lineHeight: 18,
                }}
              >
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Timestamp */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: 'rgba(148,163,184,0.5)',
            marginTop: 2,
          }}
        >
          {timeStr}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ActivityTimeline() {
  const activityEvents = useActivityStore((state) => state.activities);
  const [visibleGroupCount, setVisibleGroupCount] = useState(GROUPS_PER_PAGE);

  useFocusEffect(
    useCallback(() => {
      setVisibleGroupCount(GROUPS_PER_PAGE);
    }, [])
  );

  const allGroups = groupActivities(activityEvents);
  const visibleGroups = allGroups.slice(0, visibleGroupCount);

  // Group the visible groups by relative date for section headers
  const dateGrouped: { title: string; groups: ActivityGroup[] }[] = [];
  visibleGroups.forEach(group => {
    const title = getRelativeDate(group.timestamp);
    const existing = dateGrouped.find(g => g.title === title);
    if (existing) {
      existing.groups.push(group);
    } else {
      dateGrouped.push({ title, groups: [group] });
    }
  });

  if (visibleGroups.length === 0) {
    return (
      <Animated.View layout={LinearTransition.springify()} style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 8 }}>
        <Animated.View entering={FadeInDown.duration(200).delay(200).springify()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <History size={14} color="#94a3b8" strokeWidth={2} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', letterSpacing: 0.3 }}>Recent Activity</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(200).delay(225).springify()}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(226,232,240,0.6)',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Clock size={18} color="#cbd5e1" strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(148,163,184,0.8)', textAlign: 'center' }}>
            Your recent actions will appear here
          </Text>
        </Animated.View>
      </Animated.View>
    );
  }

  let runningIndex = 0;

  return (
    <Animated.View layout={LinearTransition.springify()} style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 8 }}>
      {/* Section header */}
      <Animated.View entering={FadeInDown.duration(200).delay(200).springify()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <History size={14} color="#94a3b8" strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', letterSpacing: 0.3 }}>Recent Activity</Text>
        </View>
      </Animated.View>

      {/* Timeline content */}
      <View style={{ gap: 16 }}>
        {dateGrouped.map((dateGroup, dateIndex) => {
          const previousGroupsCount = dateGrouped.slice(0, dateIndex).reduce((sum, dg) => sum + dg.groups.length, 0);

          return (
            <View key={dateGroup.title} style={{ gap: 8 }}>
              {/* Date header */}
              <Animated.View entering={FadeInDown.duration(200).delay(225 + (previousGroupsCount + dateIndex) * 25).springify()}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'capitalize',
                    letterSpacing: 0.5,
                    paddingLeft: 4,
                  }}
                >
                  {dateGroup.title}
                </Text>
              </Animated.View>

              {/* Group cards */}
              <View style={{ gap: 6 }}>
                {dateGroup.groups.map((group, groupIdx) => {
                  const cardIndex = previousGroupsCount + groupIdx;
                  return (
                    <ActivityGroupCard
                      key={group.id}
                      group={group}
                      index={cardIndex + 1}
                      baseDelay={225}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* See More / See Less */}
        {allGroups.length > GROUPS_PER_PAGE && (
          <Animated.View
            entering={FadeInDown.duration(200).delay(225 + visibleGroups.length * 25).springify()}
            layout={LinearTransition.springify()}
            style={{ alignItems: 'center', marginTop: 4, marginBottom: 8 }}
          >
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => {
                hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                if (visibleGroupCount >= allGroups.length) {
                  setVisibleGroupCount(GROUPS_PER_PAGE);
                } else {
                  setVisibleGroupCount(prev => prev + GROUPS_PER_PAGE);
                }
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>
                {visibleGroupCount >= allGroups.length ? 'See Less' : 'See More'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
