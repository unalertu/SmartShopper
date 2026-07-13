import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListsStore } from "./useListsStore";
import { useSettingsStore } from "./useSettingsStore";
import { getMaxItemsPerList } from '@/constants/tierConfig';
import { useActivityStore } from "./useActivityStore";
import { useStatsStore } from "./useStatsStore";
import { useReviewStore } from "./useReviewStore";
import { maybeRequestReview } from "@/services/reviewService";

export interface ShoppingItem {
  id: string;
  listId: number;
  name: string;
  quantity: number;
  unit: string;
  isPurchased: boolean;
  category: string;
  createdAt: number;
}

interface ShoppingListState {
  items: ShoppingItem[];
  addItem: (listId: number, item: Omit<ShoppingItem, "id" | "listId" | "createdAt" | "isPurchased">) => void;
  removeItem: (id: string) => void;
  togglePurchased: (id: string) => void;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  clearPurchased: (listId?: number) => void;
  clearAll: (listId?: number) => void;
  getUnpurchasedCount: (listId?: number) => number;

  /**
   * Check if an item can be added to a specific list.
   * Free users: max 25 items/list. Pro users: unlimited items/list.
   */
  canAddItemToList: (listId: number, isPro: boolean) => boolean;

  /**
   * Returns the current item count for a specific list.
   */
  getItemCountForList: (listId: number) => number;
  
  restoreItem: (item: ShoppingItem) => void;
}

const generateId = () =>
  `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (listId, item) =>
        set((state) => {
          // Authoritative tier gate: interactive callers show their own upsell
          // before calling this, but bulk paths (templates, suggestion lists,
          // "Most Purchased" / "Forgotten Items") add in a loop with no check.
          // Enforcing here keeps the per-list cap from being bypassed. restoreItem
          // (undo) intentionally skips this so a delete can always be reverted.
          const isPro = useSettingsStore.getState().isPro;
          const currentCount = state.items.filter((i) => i.listId === listId).length;
          if (currentCount >= getMaxItemsPerList(isPro)) {
            return state;
          }
          const newItem = {
            ...item,
            id: generateId(),
            listId,
            isPurchased: false,
            createdAt: Date.now(),
          };
          const newItems = [newItem, ...state.items];
          const newCount = newItems.filter(i => i.listId === listId).length;
          useListsStore.getState().updateListCount(listId, newCount);
          const listName = useListsStore.getState().lists.find(l => l.id === listId)?.name || 'Unknown List';
          useActivityStore.getState().logActivity({
            type: 'item_added',
            title: item.name,
            subtitle: 'Item added',
            listId,
            listName,
          });
          return { items: newItems };
        }),

      removeItem: (id) =>
        set((state) => {
          const itemToRemove = state.items.find(i => i.id === id);
          const newItems = state.items.filter((item) => item.id !== id);
          if (itemToRemove) {
            const newCount = newItems.filter(i => i.listId === itemToRemove.listId).length;
            useListsStore.getState().updateListCount(itemToRemove.listId, newCount);
            const listName = useListsStore.getState().lists.find(l => l.id === itemToRemove.listId)?.name || 'Unknown List';
            useActivityStore.getState().logActivity({
              type: 'item_removed',
              title: itemToRemove.name,
              subtitle: 'Item removed',
              listId: itemToRemove.listId,
              listName,
            });
          }
          return { items: newItems };
        }),

      restoreItem: (item) =>
        set((state) => {
          const newItems = [item, ...state.items];
          const newCount = newItems.filter(i => i.listId === item.listId).length;
          useListsStore.getState().updateListCount(item.listId, newCount);
          const listName = useListsStore.getState().lists.find(l => l.id === item.listId)?.name || 'Unknown List';
          useActivityStore.getState().logActivity({
            type: 'item_restored',
            title: item.name,
            subtitle: 'Item restored',
            listId: item.listId,
            listName,
          });
          return { items: newItems };
        }),


      togglePurchased: (id) => {
        // A transition to "purchased" is a successful, positive interaction —
        // capture it before the set so we can feed the smart review prompt.
        const toggledItem = get().items.find((i) => i.id === id);
        const wasUnpurchased = toggledItem?.isPurchased === false;
        const toggledListId = toggledItem?.listId;

        set((state) => {
          const targetItem = state.items.find(i => i.id === id);
          if (targetItem) {
            const listName = useListsStore.getState().lists.find(l => l.id === targetItem.listId)?.name || 'Unknown List';
            if (!targetItem.isPurchased) {
              useStatsStore.getState().recordTripAssisted();
              useActivityStore.getState().logActivity({
                type: 'item_completed',
                title: targetItem.name,
                subtitle: 'Marked as purchased',
                listId: targetItem.listId,
                listName,
              });
            } else {
              useActivityStore.getState().logActivity({
                type: 'item_uncompleted',
                title: targetItem.name,
                subtitle: 'Marked as unpurchased',
                listId: targetItem.listId,
                listName,
              });
            }
            useListsStore.getState().updateListTimestamp(targetItem.listId);
          }
          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
            ),
          };
        });

        if (wasUnpurchased) {
          // Marking an item purchased is a positive engagement signal.
          useReviewStore.getState().recordPositiveAction('item_purchased');
          // If that was the last open item, the whole list is now complete —
          // an even stronger positive signal, counted on top.
          if (toggledListId != null && get().getUnpurchasedCount(toggledListId) === 0) {
            useReviewStore.getState().recordPositiveAction('list_completed');
          }
          // Defer so the checkbox tap/animation settles before any native
          // review dialog can appear. Self-throttles via the 90-day / 3-lifetime
          // gates, so it's safe to call on every purchase.
          setTimeout(() => {
            void maybeRequestReview();
          }, 1200);
        }
      },

      updateItem: (id, updates) =>
        set((state) => {
          const targetItem = state.items.find(i => i.id === id);
          if (targetItem) {
            useListsStore.getState().updateListTimestamp(targetItem.listId);
          }
          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          };
        }),

      clearPurchased: (listId) =>
        set((state) => {
          const itemsToRemove = state.items.filter((item) => 
            listId ? (item.listId === listId && item.isPurchased) : item.isPurchased
          );
          if (itemsToRemove.length > 0) {
            const listName = listId ? useListsStore.getState().lists.find(l => l.id === listId)?.name || 'Unknown List' : 'All Lists';
            useActivityStore.getState().logActivity({
              type: 'purchased_cleared',
              title: `Cleared purchased items`,
              subtitle: `Removed ${itemsToRemove.length} purchased items`,
              listId,
              listName,
              count: itemsToRemove.length,
            });
          }
          return {
            items: state.items.filter((item) => 
              listId ? (item.listId !== listId || !item.isPurchased) : !item.isPurchased
            ),
          };
        }),

      clearAll: (listId) => 
        set((state) => {
          if (listId) {
            const itemsToRemove = state.items.filter((item) => item.listId === listId);
            if (itemsToRemove.length > 0) {
              const listName = useListsStore.getState().lists.find(l => l.id === listId)?.name || 'Unknown List';
              useActivityStore.getState().logActivity({
                type: 'list_cleared',
                title: 'Cleared all items in list',
                subtitle: `Cleared ${itemsToRemove.length} items`,
                listId,
                listName,
                count: itemsToRemove.length,
              });
            }
          } else {
            if (state.items.length > 0) {
              useActivityStore.getState().logActivity({
                type: 'list_cleared',
                title: 'Cleared all items',
                subtitle: `Cleared ${state.items.length} items`,
                listName: 'All Lists',
                count: state.items.length,
              });
            }
          }
          return { 
            items: listId ? state.items.filter(item => item.listId !== listId) : [] 
          };
        }),

      getUnpurchasedCount: (listId) =>
        get().items.filter((item) => 
          listId ? (item.listId === listId && !item.isPurchased) : !item.isPurchased
        ).length,

      canAddItemToList: (listId: number, isPro: boolean) => {
        const currentCount = get().items.filter(i => i.listId === listId).length;
        const max = getMaxItemsPerList(isPro);
        return currentCount < max;
      },

      getItemCountForList: (listId: number) =>
        get().items.filter(i => i.listId === listId).length,
    }),
    {
      name: "shopping-list-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
