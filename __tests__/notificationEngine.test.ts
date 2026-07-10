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