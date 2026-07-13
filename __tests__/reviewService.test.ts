/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Tests for the smart in-app review gate: positive-experience floor,
 * 90-day cooldown, and 3-lifetime attempt cap.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(async () => true),
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => {}),
}));

// The native-module presence probe used by reviewService.
(globalThis as any).expo = { modules: { ExpoStoreReview: {} } };

import {
  isReviewEligible,
  maybeRequestReview,
  confirmReviewRequest,
  dismissReviewPrompt,
} from '../services/reviewService';
import { useReviewStore } from '../store/useReviewStore';
import * as StoreReview from 'expo-store-review';

const DAY_MS = 24 * 60 * 60 * 1000;

function setState(partial: Partial<ReturnType<typeof useReviewStore.getState>>) {
  useReviewStore.setState(partial as any);
}

beforeEach(() => {
  useReviewStore.setState({
    appLaunchCount: 0,
    positiveActionCount: 0,
    lifetimeRequestCount: 0,
    lastRequestAt: null,
    isPromptVisible: false,
  });
  (StoreReview.requestReview as jest.Mock).mockClear();
});

describe('isReviewEligible', () => {
  it('is false with too few launches even if positive actions clear the floor', () => {
    setState({ appLaunchCount: 6, positiveActionCount: 3 });
    expect(isReviewEligible()).toBe(false);
  });

  it('is true once launches (>=7) and positive actions (>=3) clear the floor', () => {
    setState({ appLaunchCount: 7, positiveActionCount: 3 });
    expect(isReviewEligible()).toBe(true);
  });

  it('requires the engagement score, not just launches', () => {
    setState({ appLaunchCount: 20, positiveActionCount: 2 });
    expect(isReviewEligible()).toBe(false);
  });

  it('blocks a re-request within 90 days of the last one', () => {
    const now = Date.now();
    setState({
      appLaunchCount: 10,
      positiveActionCount: 10,
      lifetimeRequestCount: 1,
      lastRequestAt: now - 30 * DAY_MS,
    });
    expect(isReviewEligible(now)).toBe(false);
  });

  it('allows a re-request after 90 days have elapsed', () => {
    const now = Date.now();
    setState({
      appLaunchCount: 10,
      positiveActionCount: 10,
      lifetimeRequestCount: 1,
      lastRequestAt: now - 91 * DAY_MS,
    });
    expect(isReviewEligible(now)).toBe(true);
  });

  it('accumulates the engagement score across mixed positive-action sources', () => {
    setState({ appLaunchCount: 7 });
    const review = useReviewStore.getState();
    review.recordPositiveAction('item_purchased');
    review.recordPositiveAction('store_saved');
    review.recordPositiveAction('nearby_reminder');
    expect(useReviewStore.getState().positiveActionCount).toBe(3);
    expect(isReviewEligible()).toBe(true);
  });

  it('never asks more than 3 times in the app lifetime', () => {
    const now = Date.now();
    setState({
      appLaunchCount: 100,
      positiveActionCount: 100,
      lifetimeRequestCount: 3,
      lastRequestAt: now - 5 * 365 * DAY_MS,
    });
    expect(isReviewEligible(now)).toBe(false);
  });

  it('registerReviewRequested advances the ledger toward both limits', () => {
    const before = Date.now();
    useReviewStore.getState().registerReviewRequested();
    const s = useReviewStore.getState();
    expect(s.lifetimeRequestCount).toBe(1);
    expect(s.lastRequestAt).toBeGreaterThanOrEqual(before);
  });
});

describe('pre-prompt flow', () => {
  beforeEach(() => {
    setState({ appLaunchCount: 7, positiveActionCount: 3 });
  });

  it('maybeRequestReview shows the modal without calling native or counting', async () => {
    const shown = await maybeRequestReview();
    expect(shown).toBe(true);
    expect(useReviewStore.getState().isPromptVisible).toBe(true);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    expect(useReviewStore.getState().lifetimeRequestCount).toBe(0);
  });

  it('maybeRequestReview does nothing when ineligible', async () => {
    setState({ appLaunchCount: 1, positiveActionCount: 0 });
    const shown = await maybeRequestReview();
    expect(shown).toBe(false);
    expect(useReviewStore.getState().isPromptVisible).toBe(false);
  });

  it('confirmReviewRequest requests native review and counts the attempt', async () => {
    useReviewStore.getState().showReviewPrompt();
    const before = Date.now();
    await confirmReviewRequest();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(useReviewStore.getState().isPromptVisible).toBe(false);
    expect(useReviewStore.getState().lifetimeRequestCount).toBe(1);
    expect(useReviewStore.getState().lastRequestAt).toBeGreaterThanOrEqual(before);
  });

  it('dismissReviewPrompt hides the modal without counting an attempt', () => {
    useReviewStore.getState().showReviewPrompt();
    dismissReviewPrompt();
    expect(useReviewStore.getState().isPromptVisible).toBe(false);
    expect(useReviewStore.getState().lifetimeRequestCount).toBe(0);
    expect(useReviewStore.getState().lastRequestAt).toBeNull();
  });
});
