import { create } from "zustand";

/**
 * Debug logs and metrics for the background pipeline.
 * Deliberately NOT persisted: this state changes many times per background
 * wake-up, and keeping it inside a persisted store made zustand's persist
 * middleware rewrite the saved-locations blob to AsyncStorage on every log
 * line. Session-only is fine — the debug screen inspects the live session.
 */

interface DebugMetrics {
  backgroundExecutions: number;
  overpassRequests: number;
  notificationsTriggered: number;
  fetchThrottled: boolean;
  consecutiveHighSpeedCount: number;
}

interface DebugStoreState {
  debugMetrics: DebugMetrics;
  incrementDebugMetric: (key: keyof DebugMetrics) => void;
  setDebugMetric: <K extends keyof DebugMetrics>(key: K, value: DebugMetrics[K]) => void;

  debugLogs: string[];
  addDebugLog: (msg: string) => void;
  clearDebugLogs: () => void;
}

export const useDebugStore = create<DebugStoreState>()((set) => ({
  debugMetrics: {
    backgroundExecutions: 0,
    overpassRequests: 0,
    notificationsTriggered: 0,
    fetchThrottled: false,
    consecutiveHighSpeedCount: 0,
  },
  debugLogs: [],

  incrementDebugMetric: (key) => set((state) => ({
    debugMetrics: {
      ...state.debugMetrics,
      [key]: typeof state.debugMetrics[key] === 'number'
        ? (state.debugMetrics[key] as number) + 1
        : state.debugMetrics[key],
    },
  })),
  setDebugMetric: (key, value) => set((state) => ({
    debugMetrics: {
      ...state.debugMetrics,
      [key]: value,
    },
  })),

  addDebugLog: (msg) => set((state) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const entry = `[${timestamp}] ${msg}`;
    return { debugLogs: [entry, ...state.debugLogs].slice(0, 100) };
  }),
  clearDebugLogs: () => set({ debugLogs: [] }),
}));
