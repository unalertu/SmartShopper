/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Regression tests for active shopping list selection used by
 * rich location notifications (body items + deep-link listId).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { geoEngine } from '../services/geoEngine';

const seedStorage = async (lists: any[], items: any[]) => {
  await AsyncStorage.setItem('lists-storage', JSON.stringify({ state: { lists } }));
  await AsyncStorage.setItem('shopping-list-storage', JSON.stringify({ state: { items } }));
};

describe('geoEngine.getActiveShoppingList', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the most recently updated list that has unpurchased items', async () => {
    await seedStorage(
      [
        { id: 1, name: 'Groceries', updatedAt: 2000 },
        { id: 2, name: 'Hardware', updatedAt: 3000 },
      ],
      [
        { id: 'a', listId: 1, name: 'Milk', isPurchased: false },
        { id: 'b', listId: 2, name: 'Screws', isPurchased: false },
        { id: 'c', listId: 2, name: 'Nails', isPurchased: false },
      ]
    );

    const active = await geoEngine.getActiveShoppingList();
    expect(active).not.toBeNull();
    expect(active!.listId).toBe(2);
    expect(active!.listName).toBe('Hardware');
    expect(active!.items.map((i) => i.name)).toEqual(['Screws', 'Nails']);
  });

  it('only includes unpurchased items', async () => {
    await seedStorage(
      [{ id: 1, name: 'Groceries', updatedAt: 2000 }],
      [
        { id: 'a', listId: 1, name: 'Milk', isPurchased: false },
        { id: 'b', listId: 1, name: 'Eggs', isPurchased: true },
      ]
    );

    const active = await geoEngine.getActiveShoppingList();
    expect(active!.listId).toBe(1);
    expect(active!.items.map((i) => i.name)).toEqual(['Milk']);
  });

  it('skips lists whose items are all purchased', async () => {
    await seedStorage(
      [
        { id: 1, name: 'Groceries', updatedAt: 2000 },
        { id: 2, name: 'Hardware', updatedAt: 3000 },
      ],
      [
        { id: 'a', listId: 1, name: 'Milk', isPurchased: false },
        { id: 'b', listId: 2, name: 'Screws', isPurchased: true },
      ]
    );

    const active = await geoEngine.getActiveShoppingList();
    expect(active!.listId).toBe(1);
  });

  it('returns null when every item is purchased', async () => {
    await seedStorage(
      [{ id: 1, name: 'Groceries', updatedAt: 2000 }],
      [{ id: 'a', listId: 1, name: 'Milk', isPurchased: true }]
    );

    expect(await geoEngine.getActiveShoppingList()).toBeNull();
  });

  it('returns null when storage is empty', async () => {
    expect(await geoEngine.getActiveShoppingList()).toBeNull();
  });
});

describe('geoEngine.getUnpurchasedItems (back-compat)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the active list items', async () => {
    await seedStorage(
      [{ id: 1, name: 'Groceries', updatedAt: 2000 }],
      [{ id: 'a', listId: 1, name: 'Milk', isPurchased: false }]
    );
    expect(await geoEngine.getUnpurchasedItems()).toEqual([{ name: 'Milk' }]);
  });

  it('returns an empty array when there is no active list', async () => {
    expect(await geoEngine.getUnpurchasedItems()).toEqual([]);
  });
});