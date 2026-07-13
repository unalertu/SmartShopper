import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The kinds of positive interactions that feed the engagement score. Each one
 * contributes equally (+1); the label exists for clarity and debugging, and
 * makes it easy to reweight later without touching call sites.
 */
export type PositiveActionSource =
  | "item_purchased"
  | "list_completed"
  | "store_saved"
  | "nearby_reminder";

/**
 * Persistent state backing the smart in-app review prompt.
 *
 * The store only holds the raw signals and the request ledger — the decision
 * of *when* to actually ask lives in `services/reviewService.ts`. Keeping the
 * counters here (persisted) is what lets us honour the two hard limits across
 * launches:
 *   • never re-ask within 90 days  (via `lastRequestAt`)
 *   • never ask more than 3 times, ever  (via `lifetimeRequestCount`)
 */
interface ReviewStoreState {
  /** Cold-start launches counted so far (engagement floor). */
  appLaunchCount: number;
  /**
   * Engagement score: the running total of positive interactions across all
   * sources (items purchased, lists completed, stores saved, nearby reminders).
   */
  positiveActionCount: number;
  /** How many times we've asked for a review from the app side. Hard-capped at 3. */
  lifetimeRequestCount: number;
  /** Epoch ms of the most recent review request, or null if never asked. */
  lastRequestAt: number | null;

  /**
   * Whether the custom pre-prompt modal ("Enjoying GeoCart?") is on screen.
   * Transient UI state — deliberately NOT persisted (see `partialize`).
   */
  isPromptVisible: boolean;

  recordAppLaunch: () => void;
  /** Adds +1 to the engagement score. `source` is for clarity/debugging only. */
  recordPositiveAction: (source?: PositiveActionSource) => void;
  /** Called by the review service once a native review prompt has been requested. */
  registerReviewRequested: () => void;
  /** Shows the custom pre-prompt modal. */
  showReviewPrompt: () => void;
  /** Hides the custom pre-prompt modal. */
  hideReviewPrompt: () => void;
}

export const useReviewStore = create<ReviewStoreState>()(
  persist(
    (set) => ({
      appLaunchCount: 0,
      positiveActionCount: 0,
      lifetimeRequestCount: 0,
      lastRequestAt: null,
      isPromptVisible: false,

      recordAppLaunch: () =>
        set((state) => ({ appLaunchCount: state.appLaunchCount + 1 })),

      recordPositiveAction: (_source) =>
        set((state) => ({ positiveActionCount: state.positiveActionCount + 1 })),

      registerReviewRequested: () =>
        set((state) => ({
          lifetimeRequestCount: state.lifetimeRequestCount + 1,
          lastRequestAt: Date.now(),
        })),

      showReviewPrompt: () => set({ isPromptVisible: true }),
      hideReviewPrompt: () => set({ isPromptVisible: false }),
    }),
    {
      name: "review-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the counters/ledger — never the transient modal flag.
      partialize: (state) => ({
        appLaunchCount: state.appLaunchCount,
        positiveActionCount: state.positiveActionCount,
        lifetimeRequestCount: state.lifetimeRequestCount,
        lastRequestAt: state.lastRequestAt,
      }),
    }
  )
);
