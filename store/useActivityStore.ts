import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivityEventType =
  | 'list_created'
  | 'list_removed'
  | 'item_added'
  | 'item_removed'
  | 'item_completed'
  | 'item_restored'
  | 'purchased_cleared'
  | 'list_cleared';

/** List-level event types that should never be merged into item-level groups */
const LIST_LEVEL_TYPES: ActivityEventType[] = [
  'list_created',
  'list_removed',
  'list_cleared',
  'purchased_cleared',
];

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle: string;
  timestamp: number;
  listId?: number;
  /** The list name at the time the event was logged */
  listName?: string;
  /** For aggregated events (e.g. "Cleared 5 purchased items"), defaults to 1 */
  count?: number;
}

export interface ActivityGroup {
  id: string;
  listId?: number;
  listName: string;
  /** Multi-line summary: ["Added 6 items", "Purchased 2 items", "Removed 1 item"] */
  summaryLines: string[];
  /** Timestamp of the latest event in the group */
  timestamp: number;
  /** True for standalone list-level actions */
  isListLevel: boolean;
  /** Total number of individual events in this group */
  eventCount: number;
}

/** Maximum time gap (ms) between events in the same shopping session */
const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Groups activity events into shopping sessions.
 *
 * Rules:
 * 1. List-level events always become their own standalone group.
 * 2. Item-level events are merged into a session if:
 *    - Same listId as the current group
 *    - Consecutive (no event from another list in between)
 *    - Within 5 minutes of the group's latest timestamp
 * 3. Events are assumed to be sorted newest-first (as stored).
 */
export function groupActivities(events: ActivityEvent[]): ActivityGroup[] {
  if (events.length === 0) return [];

  const groups: ActivityGroup[] = [];
  let currentGroup: { events: ActivityEvent[] } | null = null;

  for (const event of events) {
    const isListLevel = LIST_LEVEL_TYPES.includes(event.type);

    if (isListLevel) {
      // Flush any open group
      if (currentGroup) {
        groups.push(buildGroup(currentGroup.events));
        currentGroup = null;
      }
      // List-level events are always standalone
      groups.push(buildListLevelGroup(event));
      continue;
    }

    // Item-level event — try to merge into current group
    if (currentGroup) {
      const groupLatest = currentGroup.events[0]; // newest event in group (events are newest-first)
      const sameList = event.listId != null && event.listId === groupLatest.listId;
      const withinWindow = Math.abs(groupLatest.timestamp - event.timestamp) <= SESSION_GAP_MS;

      if (sameList && withinWindow) {
        currentGroup.events.push(event);
        continue;
      }

      // Can't merge — flush current group
      groups.push(buildGroup(currentGroup.events));
      currentGroup = null;
    }

    // Start a new group
    currentGroup = { events: [event] };
  }

  // Flush the last open group
  if (currentGroup) {
    groups.push(buildGroup(currentGroup.events));
  }

  return groups;
}

function buildGroup(events: ActivityEvent[]): ActivityGroup {
  const latestEvent = events[0]; // events are newest-first
  const listName = latestEvent.listName || latestEvent.title || 'Unknown List';

  // Count events by type, respecting the `count` field for aggregated events
  const counts: Record<string, number> = {};
  for (const e of events) {
    const c = e.count || 1;
    counts[e.type] = (counts[e.type] || 0) + c;
  }

  const summaryLines = buildSummaryLines(counts);
  const totalCount = events.reduce((sum, e) => sum + (e.count || 1), 0);

  return {
    id: `group_${latestEvent.id}`,
    listId: latestEvent.listId,
    listName,
    summaryLines,
    timestamp: latestEvent.timestamp,
    isListLevel: false,
    eventCount: totalCount,
  };
}

function buildListLevelGroup(event: ActivityEvent): ActivityGroup {
  const listName = event.listName || event.title || 'Unknown List';

  let summaryLine: string;
  switch (event.type) {
    case 'list_created':
      summaryLine = 'Created list';
      break;
    case 'list_removed':
      summaryLine = 'Deleted list';
      break;
    case 'purchased_cleared':
      summaryLine = event.subtitle || `Cleared ${event.count || 0} purchased items`;
      break;
    case 'list_cleared':
      summaryLine = event.subtitle || `Cleared all items`;
      break;
    default:
      summaryLine = event.subtitle || event.title;
  }

  return {
    id: `group_${event.id}`,
    listId: event.listId,
    listName,
    summaryLines: [summaryLine],
    timestamp: event.timestamp,
    isListLevel: true,
    eventCount: event.count || 1,
  };
}

/** Builds multi-line summary from action type counts, ordered logically */
function buildSummaryLines(counts: Record<string, number>): string[] {
  const lines: string[] = [];
  const order: [string, string][] = [
    ['item_added', 'Added'],
    ['item_completed', 'Purchased'],
    ['item_removed', 'Removed'],
    ['item_restored', 'Restored'],
  ];

  for (const [type, verb] of order) {
    const count = counts[type];
    if (count && count > 0) {
      lines.push(`${verb} ${count} ${count === 1 ? 'item' : 'items'}`);
    }
  }

  // Catch any unknown types
  for (const [type, count] of Object.entries(counts)) {
    if (!order.some(([t]) => t === type) && count > 0) {
      lines.push(`${count} ${count === 1 ? 'action' : 'actions'}`);
    }
  }

  return lines.length > 0 ? lines : ['Activity'];
}

interface ActivityStoreState {
  activities: ActivityEvent[];
  logActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStoreState>()(
  persist(
    (set) => ({
      activities: [],

      logActivity: (event) =>
        set((state) => {
          const newEvent: ActivityEvent = {
            ...event,
            id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
          };
          
          // Keep only the last 50 activities to avoid bloat
          const newActivities = [newEvent, ...state.activities].slice(0, 50);
          
          return { activities: newActivities };
        }),

      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: "activity-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
