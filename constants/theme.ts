/**
 * Design tokens for the GeoCart app.
 * These values align with our Tailwind config for use in
 * non-className contexts (e.g., Reanimated, inline styles).
 */

export const Colors = {
  primary: {
    50: "#f0f7ff",
    100: "#e0efff",
    200: "#b8dbff",
    300: "#7abfff",
    400: "#3a9eff",
    500: "#0a7eff",
    600: "#005fd4",
    700: "#004bab",
    800: "#00408d",
    900: "#003775",
  },
  accent: {
    50: "#fdf4ff",
    100: "#fae8ff",
    200: "#f5d0fe",
    300: "#f0abfc",
    400: "#e879f9",
    500: "#d946ef",
    600: "#c026d3",
    700: "#a21caf",
    800: "#86198f",
    900: "#701a75",
  },
  surface: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  white: "#ffffff",
  black: "#000000",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 22,
  sheet: 28,
  "3xl": 32,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

