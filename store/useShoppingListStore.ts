import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isPurchased: boolean;
  category: string;
  createdAt: number;
}

interface ShoppingListState {
  items: ShoppingItem[];
  addItem: (item: Omit<ShoppingItem, "id" | "createdAt" | "isPurchased">) => void;
  removeItem: (id: string) => void;
  togglePurchased: (id: string) => void;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  clearPurchased: () => void;
  clearAll: () => void;
  getUnpurchasedCount: () => number;
}

const generateId = () =>
  `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [
            {
              ...item,
              id: generateId(),
              isPurchased: false,
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

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

      clearPurchased: () =>
        set((state) => ({
          items: state.items.filter((item) => !item.isPurchased),
        })),

      clearAll: () => set({ items: [] }),

      getUnpurchasedCount: () =>
        get().items.filter((item) => !item.isPurchased).length,
    }),
    {
      name: "shopping-list-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
