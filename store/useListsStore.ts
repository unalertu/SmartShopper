import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ShoppingList {
  id: number;
  name: string;
  count: number;
  createdAt?: number;
}

interface ListsStoreState {
  lists: ShoppingList[];
  addList: (name: string) => void;
  removeList: (id: number) => void;
  updateListCount: (id: number, count: number) => void;
}

export const useListsStore = create<ListsStoreState>()(
  persist(
    (set) => ({
      lists: [
        { id: 1, name: "Ahmet için alınacaklar", count: 4, createdAt: Date.now() }, 
        { id: 2, name: "Kendi ihtiyaçlarım", count: 12, createdAt: Date.now() - 86400000 }, 
        { id: 3, name: "Buse'ye alınacaklar", count: 2, createdAt: Date.now() - 172800000 }
      ],
      addList: (name) =>
        set((state) => ({
          lists: [
            { id: Date.now(), name, count: 0, createdAt: Date.now() },
            ...state.lists,
          ],
        })),
      removeList: (id) =>
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== id),
        })),
      updateListCount: (id, count) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === id ? { ...list, count } : list
          ),
        })),
    }),
    {
      name: "lists-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
