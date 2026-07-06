export const CATEGORIES = [
  { label: "General", value: "🛒 General", icon: "🛒" },
  { label: "Fruits", value: "🍎 Fruits", icon: "🍎" },
  { label: "Vegetables", value: "🥦 Vegetables", icon: "🥦" },
  { label: "Dairy", value: "🥛 Dairy", icon: "🥛" },
  { label: "Bakery", value: "🍞 Bakery", icon: "🍞" },
  { label: "Meat", value: "🥩 Meat", icon: "🥩" },
  { label: "Seafood", value: "🐟 Seafood", icon: "🐟" },
  { label: "Drinks", value: "🥤 Drinks", icon: "🥤" },
  { label: "Snacks", value: "🍬 Snacks", icon: "🍬" },
  { label: "Pantry", value: "🧂 Pantry", icon: "🧂" },
  { label: "Frozen", value: "❄️ Frozen", icon: "❄️" },
  { label: "Household", value: "🧹 Household", icon: "🧹" },
  { label: "Personal Care", value: "🧴 Personal Care", icon: "🧴" },
  { label: "Beverages", value: "☕️ Beverages", icon: "☕️" },
  { label: "Office", value: "📎 Office", icon: "📎" },
  { label: "Breakfast", value: "🥞 Breakfast", icon: "🥞" },
  { label: "Cleaning", value: "🧽 Cleaning", icon: "🧽" },
  { label: "Pets", value: "🐾 Pets", icon: "🐾" },
  { label: "Health", value: "💊 Health", icon: "💊" },
  { label: "Baking", value: "🥣 Baking", icon: "🥣" },
] as const;

export const UNITS = [
  { label: "pcs", value: "pcs" },
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "L", value: "L" },
  { label: "mL", value: "mL" },
  { label: "pack", value: "pack" },
  { label: "box", value: "box" },
  { label: "bottle", value: "bottle" },
  { label: "bag", value: "bag" },
  { label: "dozen", value: "dozen" },
] as const;

export const getCategoryIcon = (categoryValue: string): string => {
  return CATEGORIES.find((c) => c.value === categoryValue)?.icon ?? "🛒";
};

export const getCategoryLabel = (categoryValue: string): string => {
  return CATEGORIES.find((c) => c.value === categoryValue)?.label ?? "General";
};
