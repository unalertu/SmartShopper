import { useReviewStore } from "@/store/useReviewStore";

/**
 * Smart in-app review prompt.
 *
 * We only ask a genuinely engaged, happy user, and we respect two hard limits
 * so the prompt can never become a nuisance:
 *   • at most once every 90 days
 *   • at most 3 times over the app's lifetime (from the app side)
 *
 * Eligibility floor for a "positive experience": the user must have opened the
 * app at least 7 times AND accumulated an engagement score of at least 3 from
 * positive interactions (items purchased, lists completed, stores saved,
 * nearby reminders received). Both signals are persisted in `useReviewStore`.
 *
 * Note: on iOS the system further rate-limits the native prompt (max ~3/year)
 * and never tells us whether the user actually reviewed. We therefore count an
 * *attempt* whenever we successfully hand off to `requestReview`.
 */

const MIN_APP_LAUNCHES = 7;
const MIN_POSITIVE_ACTIONS = 3;
const MAX_LIFETIME_REQUESTS = 3;
const MIN_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/** Prevents overlapping evaluations if two positive actions fire back-to-back. */
let isEvaluating = false;

/**
 * Resolves the native `expo-store-review` module only when it's actually
 * present AND able to present a prompt. Returns null otherwise so callers can
 * bail without side effects (e.g. dev clients built before the module existed).
 */
async function resolveNativeReview():
  Promise<typeof import("expo-store-review") | null> {
  // Skip entirely when the native module is absent — requiring it would throw
  // during module init, which Metro reports as fatal in dev even inside
  // try/catch.
  const hasNativeModule =
    (globalThis as any).expo?.modules?.ExpoStoreReview != null;
  if (!hasNativeModule) return null;

  const StoreReview =
    require("expo-store-review") as typeof import("expo-store-review");

  // isAvailableAsync: platform supports it. hasAction: the store is actually
  // configured to present a prompt.
  if (!(await StoreReview.isAvailableAsync())) return null;
  if (typeof StoreReview.hasAction === "function" && !(await StoreReview.hasAction())) {
    return null;
  }
  return StoreReview;
}

/**
 * Pure gate check — decides whether the user currently qualifies for a prompt.
 * Exported so it can be unit-tested and inspected without side effects.
 */
export function isReviewEligible(now: number = Date.now()): boolean {
  const { appLaunchCount, positiveActionCount, lifetimeRequestCount, lastRequestAt } =
    useReviewStore.getState();

  // Hard lifetime cap.
  if (lifetimeRequestCount >= MAX_LIFETIME_REQUESTS) return false;

  // 90-day cooldown since the last request.
  if (lastRequestAt != null && now - lastRequestAt < MIN_INTERVAL_MS) return false;

  // Positive-experience floor.
  if (appLaunchCount < MIN_APP_LAUNCHES) return false;
  if (positiveActionCount < MIN_POSITIVE_ACTIONS) return false;

  return true;
}

/**
 * Shows the custom pre-prompt modal ("Enjoying GeoCart?") if — and only if —
 * the user is eligible and the native review dialog could actually be
 * presented. Safe to call liberally after positive interactions; it
 * self-throttles.
 *
 * The native `StoreReview.requestReview()` is NOT called here and the attempt
 * is NOT counted yet — that happens only when the user taps "Rate GeoCart"
 * (see `confirmReviewRequest`).
 *
 * @returns true if the pre-prompt modal was shown.
 */
export async function maybeRequestReview(): Promise<boolean> {
  if (isEvaluating) return false;
  if (useReviewStore.getState().isPromptVisible) return false;
  if (!isReviewEligible()) return false;

  isEvaluating = true;
  try {
    // Don't show the friendly pre-prompt if the native dialog couldn't be
    // presented afterwards — that would be a dead end for the user.
    const StoreReview = await resolveNativeReview();
    if (!StoreReview) return false;

    // Re-check: eligibility/visibility could have changed during the await.
    if (useReviewStore.getState().isPromptVisible) return false;
    if (!isReviewEligible()) return false;

    useReviewStore.getState().showReviewPrompt();
    return true;
  } catch (error) {
    if (__DEV__) console.warn("[Review] pre-prompt evaluation failed:", error);
    return false;
  } finally {
    isEvaluating = false;
  }
}

/**
 * Handles the user tapping "Rate GeoCart" in the pre-prompt. Dismisses the
 * modal, requests the native review dialog, and — only now — counts the
 * attempt against the 90-day / 3-lifetime limits.
 */
export async function confirmReviewRequest(): Promise<void> {
  // Hide the pre-prompt first so it isn't left stacked under the native sheet.
  useReviewStore.getState().hideReviewPrompt();
  try {
    const StoreReview = await resolveNativeReview();
    if (!StoreReview) return;

    await StoreReview.requestReview();

    // The user chose to rate — count the attempt now.
    useReviewStore.getState().registerReviewRequested();
  } catch (error) {
    if (__DEV__) console.warn("[Review] native review request failed:", error);
  }
}

/**
 * Handles the user tapping "Not Now" in the pre-prompt. Only dismisses the
 * modal — the request is deliberately NOT counted, so the user may be asked
 * again on a future eligible trigger.
 */
export function dismissReviewPrompt(): void {
  useReviewStore.getState().hideReviewPrompt();
}
