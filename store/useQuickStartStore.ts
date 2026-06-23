import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QuickStartTemplate {
  name: string;
  usageCount: number;
}

interface QuickStartStoreState {
  templates: QuickStartTemplate[];
  incrementUsage: (name: string) => void;
}

const DEFAULT_TEMPLATES: QuickStartTemplate[] = [
  { name: 'Weekly Groceries', usageCount: 0 },
  { name: 'Dinner Party', usageCount: 0 },
  { name: 'Office Supplies', usageCount: 0 },
  { name: 'Breakfast', usageCount: 0 },
  { name: 'Cleaning', usageCount: 0 },
  { name: 'Pet Supplies', usageCount: 0 },
  { name: 'Personal Care', usageCount: 0 },
  { name: 'BBQ', usageCount: 0 },
  { name: 'Snacks', usageCount: 0 },
  { name: 'Pharmacy', usageCount: 0 },
  { name: 'Baking', usageCount: 0 },
];

export const useQuickStartStore = create<QuickStartStoreState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      incrementUsage: (name) =>
        set((state) => {
          const lowerName = name.toLowerCase();
          const existing = state.templates.find(t => t.name.toLowerCase() === lowerName);
          if (existing) {
            return {
              templates: state.templates.map(t => 
                t.name.toLowerCase() === lowerName ? { ...t, usageCount: t.usageCount + 1 } : t
              )
            };
          } else {
            return {
              templates: [...state.templates, { name, usageCount: 1 }]
            };
          }
        }),
    }),
    {
      name: "quick-start-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
