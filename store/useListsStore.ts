import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMaxLists } from '@/constants/tierConfig';
import { useActivityStore } from "./useActivityStore";

export interface ShoppingList {
  id: number;
  name: string;
  count: number;
  createdAt?: number;
}

interface ListsStoreState {
  lists: ShoppingList[];
  addList: (name: string) => number;
  removeList: (id: number) => void;
  updateListCount: (id: number, count: number) => void;
  renameList: (id: number, newName: string) => void;

  /**
   * Check if the user can create a new list.
   * Free users: max 5 lists. Pro users: max 50 lists.
   */
  canCreateList: (isPro: boolean) => boolean;

  /**
   * Returns the current number of lists.
   */
  getListCount: () => number;
}

export const useListsStore = create<ListsStoreState>()(
  persist(
    (set, get) => ({
      lists: [
        { id: 1, name: "Ahmet için alınacaklar", count: 4, createdAt: Date.now() }, 
        { id: 2, name: "Kendi ihtiyaçlarım", count: 12, createdAt: Date.now() - 86400000 }, 
        { id: 3, name: "Buse'ye alınacaklar", count: 2, createdAt: Date.now() - 172800000 }
      ],
      addList: (name) => {
        const newId = Date.now();
        set((state) => ({
          lists: [
            { id: newId, name, count: 0, createdAt: Date.now() },
            ...state.lists,
          ],
        }));
        useActivityStore.getState().logActivity({
          type: 'list_created',
          title: name,
          subtitle: 'List created',
          listId: newId,
          listName: name,
        });
        return newId;
      },
      removeList: (id) => {
        const listToRemove = get().lists.find((l) => l.id === id);
        if (listToRemove) {
          useActivityStore.getState().logActivity({
            type: 'list_removed',
            title: listToRemove.name,
            subtitle: 'List deleted',
            listName: listToRemove.name,
          });
        }
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== id),
        }));
      },
      updateListCount: (id, count) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === id ? { ...list, count } : list
          ),
        })),
      renameList: (id, newName) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === id ? { ...list, name: newName } : list
          ),
        })),

      canCreateList: (isPro: boolean) => {
        const currentCount = get().lists.length;
        const max = getMaxLists(isPro);
        return currentCount < max;
      },

      getListCount: () => get().lists.length,
    }),
    {
      name: "lists-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
