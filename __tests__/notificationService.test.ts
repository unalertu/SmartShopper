/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Regression tests for the notification data payload (deep-link support).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { sendLocalNotification } from '../services/notificationService';

describe('sendLocalNotification', () => {
  beforeEach(() => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
  });

  it('passes listId/storeId through the notification data payload', async () => {
    await sendLocalNotification("You're near Walmart", '🛒 Milk is on your list', 'geofence-alerts', {
      type: 'location-alert',
      listId: 42,
      storeId: 'store-7',
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe("You're near Walmart");
    expect(call.content.body).toBe('🛒 Milk is on your list');
    expect(call.content.data).toEqual({
      type: 'location-alert',
      listId: 42,
      storeId: 'store-7',
    });
    expect(call.trigger).toBeNull();
  });

  it('omits the data field when no payload is given', async () => {
    await sendLocalNotification('Title', 'Body');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.data).toBeUndefined();
  });
});