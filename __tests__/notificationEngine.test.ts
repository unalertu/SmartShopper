/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Regression tests for rich location notification content.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import { notificationEngine } from '../services/notificationEngine';
import { notificationAnalytics } from '../services/notificationAnalytics';

describe('notificationEngine.buildNotificationContent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('puts the store name in the title', async () => {
    const content = await notificationEngine.buildNotificationContent(
      'Walmart',
      [{ name: 'Milk' }],
      true
    );
    expect(content.title).toBe("You're near Walmart");
  });

  it('lists items in the body for a short list', async () => {
    const content = await notificationEngine.buildNotificationContent(
      'Walmart',
      [{ name: 'Milk' }, { name: 'Eggs' }, { name: 'Bread' }],
      true
    );
    expect(content.body).toBe('🛒 Milk, Eggs, Bread are on your list');
  });

  it('uses singular phrasing for a single item', async () => {
    const content = await notificationEngine.buildNotificationContent(
      'Walmart',
      [{ name: 'Milk' }],
      true
    );
    expect(content.body).toBe('🛒 Milk is on your list');
  });

  it('uses the no-list nudge when there are no items (Remind Without a List)', async () => {
    const content = await notificationEngine.buildNotificationContent('Walmart', [], true);
    expect(content.title).toBe("You're near Walmart");
    expect(content.body).toBe("🛒 Need anything? Start a list while you're here");
  });

  it('truncates long lists with +X more', async () => {
    const items = ['Milk', 'Eggs', 'Bread', 'Butter', 'Cheese'].map((name) => ({ name }));
    const content = await notificationEngine.buildNotificationContent('Walmart', items, true);
    expect(content.body).toBe('🛒 Milk, Eggs, Bread +2 more are on your list');
  });

  it('appends the free daily limit notice when the free user hits the cap', async () => {
    jest.spyOn(notificationAnalytics, 'getState').mockResolvedValue({
      dailyLocationCount: 4,
    } as any);
    const content = await notificationEngine.buildNotificationContent(
      'Walmart',
      [{ name: 'Milk' }],
      false,
      5
    );
    expect(content.body).toContain('🛒 Milk is on your list');
    expect(content.body).toContain('free daily notification limit');
  });

  it('does not append the limit notice for pro users', async () => {
    const content = await notificationEngine.buildNotificationContent(
      'Walmart',
      [{ name: 'Milk' }],
      true,
      'unlimited'
    );
    expect(content.body).not.toContain('limit');
  });
});

describe('notificationEngine.shouldSendLocationNotification daily rollover', () => {
  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  // Equal start/end hour = 24h window; all days allowed — deterministic
  // regardless of when the test runs.
  const baseParams = {
    storeId: 'store1',
    eventId: 123,
    isPro: false,
    maxAlertsPerDay: 5 as const,
    maxNotificationsPerStorePerDay: 2 as const,
    allowedDays: [0, 1, 2, 3, 4, 5, 6],
    allowedHoursStart: 0,
    allowedHoursEnd: 0,
    snoozeUntil: null,
    shoppingListReminders: true,
  };

  const cappedState = (dailyCountDate: string) => ({
    lastNotificationAt: null,
    lastNotificationCoords: null,
    lastStoreNotifications: {},
    dailyCountDate,
    dailyLocationCount: 5,
    dailyStoreCounts: { store1: 2 },
    sentFingerprints: ['location:store1:123'],
    notificationHistory: [],
    hasSentWelcome: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows sending when the cap was reached on a PREVIOUS day (counters roll over)', async () => {
    jest
      .spyOn(notificationAnalytics, 'getState')
      .mockResolvedValue(cappedState('2000-01-01') as any);
    const saveSpy = jest
      .spyOn(notificationAnalytics, 'saveState')
      .mockResolvedValue();

    const decision = await notificationEngine.shouldSendLocationNotification(baseParams);

    expect(decision).toEqual({ allowed: true });
    // The rollover must be persisted so later readers see fresh counters
    expect(saveSpy).toHaveBeenCalled();
    const savedState = saveSpy.mock.calls[0][0];
    expect(savedState.dailyCountDate).toBe(todayKey);
    expect(savedState.dailyLocationCount).toBe(0);
    expect(savedState.dailyStoreCounts).toEqual({});
    expect(savedState.sentFingerprints).toEqual([]);
  });

  it('still blocks when the cap was reached TODAY', async () => {
    jest
      .spyOn(notificationAnalytics, 'getState')
      .mockResolvedValue(cappedState(todayKey) as any);
    const saveSpy = jest
      .spyOn(notificationAnalytics, 'saveState')
      .mockResolvedValue();

    const decision = await notificationEngine.shouldSendLocationNotification(baseParams);

    expect(decision).toEqual({ allowed: false, reason: 'daily_limit_reached' });
    expect(saveSpy).not.toHaveBeenCalled();
  });
});