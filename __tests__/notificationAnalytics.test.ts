/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Regression tests for notification history deep-link data (listId).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAnalytics } from '../services/notificationAnalytics';

describe('notificationAnalytics.recordNotification', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores the listId in the history entry', async () => {
    await notificationAnalytics.recordNotification(
      "You're near Walmart",
      '🛒 Milk is on your list',
      'store-1',
      123,
      { latitude: 1, longitude: 2 },
      42
    );

    const history = await notificationAnalytics.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].listId).toBe(42);
    expect(history[0].storeId).toBe('store-1');
    expect(history[0].type).toBe('location');
  });

  it('omits listId when not provided (back-compat)', async () => {
    await notificationAnalytics.recordNotification('Title', 'Body', 'store-1', 123);

    const history = await notificationAnalytics.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].listId).toBeUndefined();
  });
});
