import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListsStore } from "./useListsStore";

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
          return { items: newItems };
        }),

      removeItem: (id) =>
        set((state) => {
          const itemToRemove = state.items.find(i => i.id === id);
          const newItems = state.items.filter((item) => item.id !== id);
          if (itemToRemove) {
            const newCount = newItems.filter(i => i.listId === itemToRemove.listId).length;
            useListsStore.getState().updateListCount(itemToRemove.listId, newCount);
          }
          return { items: newItems };
        }),

      togglePurchased: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
          ),
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      clearPurchased: (listId) =>
        set((state) => ({
          items: state.items.filter((item) => 
            listId ? (item.listId !== listId || !item.isPurchased) : !item.isPurchased
          ),
        })),

      clearAll: (listId) => 
        set((state) => ({ 
          items: listId ? state.items.filter(item => item.listId !== listId) : [] 
        })),

      getUnpurchasedCount: (listId) =>
        get().items.filter((item) => 
          listId ? (item.listId === listId && !item.isPurchased) : !item.isPurchased
        ).length,
    }),
    {
      name: "shopping-list-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
