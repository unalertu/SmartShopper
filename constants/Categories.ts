export const CATEGORIES = [
  { label: "Fruits & Vegetables", value: "fruits-vegetables", icon: "🍎" },
  { label: "Dairy & Eggs", value: "dairy-eggs", icon: "🥛" },
  { label: "Meat & Fish", value: "meat-fish", icon: "🥩" },
  { label: "Bakery", value: "bakery", icon: "🍞" },
  { label: "Beverages", value: "beverages", icon: "🥤" },
  { label: "Snacks", value: "snacks", icon: "🍿" },
  { label: "Frozen", value: "frozen", icon: "🧊" },
  { label: "Household", value: "household", icon: "🧹" },
  { label: "Personal Care", value: "personal-care", icon: "🧴" },
  { label: "Other", value: "other", icon: "📦" },
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
  return CATEGORIES.find((c) => c.value === categoryValue)?.icon ?? "📦";
};

export const getCategoryLabel = (categoryValue: string): string => {
  return CATEGORIES.find((c) => c.value === categoryValue)?.label ?? "Other";
};
