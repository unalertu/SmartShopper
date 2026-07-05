import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivityEventType =
  | 'list_created'
  | 'list_removed'
  | 'item_added'
  | 'item_removed'
  | 'item_completed'
  | 'item_uncompleted'
  | 'item_restored'
  | 'purchased_cleared'
  | 'list_cleared'
  | 'list_renamed';

/** List-level event types that should never be merged into item-level groups */
const LIST_LEVEL_TYPES: ActivityEventType[] = [
  'list_created',
  'list_removed',
  'list_renamed',
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
  /** Distinct action types in this group (for icon selection) */
  actionTypes: ActivityEventType[];
}

/** Maximum time gap (ms) between events in the same shopping session */
const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum retention period for activities (in days) */
const MAX_RETENTION_DAYS = 14;
const MAX_RETENTION_MS = MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;

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
 *
 * @param events - Activity events (newest-first)
 * @param listsLookup - Map of listId → listName for resolving names of existing lists
 */
export function groupActivities(
  events: ActivityEvent[],
  listsLookup?: Map<number, string>
): ActivityGroup[] {
  if (events.length === 0) return [];

  const now = Date.now();
  const validEvents = events.filter(e => (now - e.timestamp) <= MAX_RETENTION_MS);

  if (validEvents.length === 0) return [];

  const groups: ActivityGroup[] = [];
  let currentGroup: { events: ActivityEvent[] } | null = null;

  for (const event of validEvents) {
    const isListLevel = LIST_LEVEL_TYPES.includes(event.type);

    if (isListLevel) {
      // Flush any open group
      if (currentGroup) {
        groups.push(buildGroup(currentGroup.events, listsLookup));
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
      groups.push(buildGroup(currentGroup.events, listsLookup));
      currentGroup = null;
    }

    // Start a new group
    currentGroup = { events: [event] };
  }

  // Flush the last open group
  if (currentGroup) {
    groups.push(buildGroup(currentGroup.events, listsLookup));
  }

  return groups;
}

function buildGroup(events: ActivityEvent[], listsLookup?: Map<number, string>): ActivityGroup {
  const latestEvent = events[0]; // events are newest-first
  const listName = resolveListName(events, listsLookup);

  // Count events by type, respecting the `count` field for aggregated events
  // For toggles (completed/uncompleted), we only count the final state of the item within this session.
  const counts: Record<string, number> = {};
  const seenToggles = new Set<string>();

  for (const e of events) {
    if (e.type === 'item_completed' || e.type === 'item_uncompleted') {
      if (seenToggles.has(e.title)) {
        // Skip earlier toggle events for the same item in this session
        continue;
      }
      seenToggles.add(e.title);
    }

    const c = e.count || 1;
    counts[e.type] = (counts[e.type] || 0) + c;
  }

  const summaryLines = buildSummaryLines(counts);
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const actionTypes = Object.keys(counts) as ActivityEventType[];

  return {
    id: `group_${latestEvent.id}`,
    listId: latestEvent.listId,
    listName,
    summaryLines,
    timestamp: latestEvent.timestamp,
    isListLevel: false,
    eventCount: totalCount,
    actionTypes,
  };
}

/**
 * Resolves the list name from events, never falling back to item names.
 * Uses the listsLookup map (listId → name) to find names of existing lists.
 */
function resolveListName(events: ActivityEvent[], listsLookup?: Map<number, string>): string {
  // 1. Check if any event has listName set
  for (const e of events) {
    if (e.listName) return e.listName;
  }
  // 2. Look up from the provided lists map by listId
  const listId = events[0]?.listId;
  if (listId != null && listsLookup) {
    const name = listsLookup.get(listId);
    if (name) return name;
  }
  // 3. Last resort
  return 'Shopping List';
}

function buildListLevelGroup(event: ActivityEvent): ActivityGroup {
  // Resolve list name — for list-level events, title is the list name
  const listName = event.listName || event.title || 'Shopping List';

  let summaryLine: string;
  switch (event.type) {
    case 'list_created':
      summaryLine = 'Created list';
      break;
    case 'list_removed':
      summaryLine = 'Deleted list';
      break;
    case 'list_renamed':
      summaryLine = event.subtitle || 'Renamed list';
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
    actionTypes: [event.type],
  };
}

/** Builds multi-line summary from action type counts, ordered logically */
function buildSummaryLines(counts: Record<string, number>): string[] {
  const lines: string[] = [];
  const order: [string, string][] = [
    ['item_added', 'Added'],
    ['item_completed', 'Purchased'],
    ['item_uncompleted', 'Unpurchased'],
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
          const now = Date.now();
          const newEvent: ActivityEvent = {
            ...event,
            id: `activity_${now}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: now,
          };
          
          // Keep only the last 50 activities and filter out activities older than MAX_RETENTION_DAYS
          const newActivities = [newEvent, ...state.activities]
            .filter(a => (now - a.timestamp) <= MAX_RETENTION_MS)
            .slice(0, 50);
          
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
