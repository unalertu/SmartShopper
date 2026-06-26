import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListsStore } from "./useListsStore";
import { getMaxItemsPerList } from '@/constants/tierConfig';
import { useActivityStore } from "./useActivityStore";

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
   * Free users: max 25 items/list. Pro users: max 500 items/list.
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


      togglePurchased: (id) =>
        set((state) => {
          const targetItem = state.items.find(i => i.id === id);
          if (targetItem && !targetItem.isPurchased) {
            const listName = useListsStore.getState().lists.find(l => l.id === targetItem.listId)?.name || 'Unknown List';
            useActivityStore.getState().logActivity({
              type: 'item_completed',
              title: targetItem.name,
              subtitle: 'Marked as purchased',
              listId: targetItem.listId,
              listName,
            });
          }
          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
            ),
          };
        }),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      clearPurchased: (listId) =>
        set((state) => {
          const itemsToRemove = state.items.filter((item) => 
            listId ? (item.listId === listId && item.isPurchased) : item.isPurchased
          );
          if (itemsToRemove.length > 0) {
            const listName = listId ? useListsStore.getState().lists.find(l => l.id === listId)?.name || 'Unknown List' : 'All Lists';
            useActivityStore.getState().logActivity({
              type: 'purchased_cleared',
              title: `Cleared ${itemsToRemove.length} purchased items`,
              subtitle: `Cleared ${itemsToRemove.length} purchased items`,
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
