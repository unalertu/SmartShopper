/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock must precede imports */
/**
 * Regression tests for the durable market cache:
 * - disk writes MERGE (a viewport-trimmed map write must never shrink the
 *   persisted cache) with TTL applied
 * - only the intentional clear (setCachedMarkets([])) overwrites
 * - geoEngine reads the union of the in-memory working set and disk
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Fitness: 3 },
  GeofencingEventType: { Enter: 1, Exit: 2 },
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
  hasStartedGeofencingAsync: jest.fn().mockResolvedValue(false),
  getBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_CONSTANTS } from '../constants';

const CACHE_KEY = 'market-cache-storage';

const market = (id: string, lastSeenAt?: number) => ({
  id,
  name: `Market ${id}`,
  latitude: 41,
  longitude: 29,
  ...(lastSeenAt !== undefined ? { lastSeenAt } : {}),
});

// The persist chain runs across a few macrotasks; poll until it settles.
const readDisk = async (): Promise<any[]> => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  const data = await AsyncStorage.getItem(CACHE_KEY);
  return data ? JSON.parse(data) : [];
};

describe('market cache persistence', () => {
  let useLocationStore: any;

  beforeAll(() => {
    useLocationStore = require('../store/useLocationStore').useLocationStore;
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
    useLocationStore.setState({ cachedMarkets: [] });
  });

  it('merges map working-set writes into disk instead of overwriting', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('a', now), market('b', now)]));

    // Map replaces the in-memory working set with a viewport-trimmed subset
    useLocationStore.getState().setCachedMarkets([market('c')]);

    const disk = await readDisk();
    expect(disk.map((m: any) => m.id).sort()).toEqual(['a', 'b', 'c']);
    // In-memory stays the map's replacement
    expect(useLocationStore.getState().cachedMarkets.map((m: any) => m.id)).toEqual(['c']);
  });

  it('clears disk on the intentional empty set', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('a', now)]));

    useLocationStore.getState().setCachedMarkets([]);

    const disk = await readDisk();
    expect(disk).toEqual([]);
  });

  it('appendCachedMarkets merges into both memory and disk', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('a', now)]));
    useLocationStore.setState({ cachedMarkets: [market('b', now)] });

    useLocationStore.getState().appendCachedMarkets([market('c')]);

    expect(useLocationStore.getState().cachedMarkets.map((m: any) => m.id).sort()).toEqual(['b', 'c']);
    const disk = await readDisk();
    expect(disk.map((m: any) => m.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('drops expired markets when merging to disk', async () => {
    const now = Date.now();
    const expired = now - NOTIFICATION_CONSTANTS.CACHE_TTL_MS - 1000;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('old', expired), market('a', now)]));

    useLocationStore.getState().setCachedMarkets([market('c')]);

    const disk = await readDisk();
    expect(disk.map((m: any) => m.id).sort()).toEqual(['a', 'c']);
  });
});

describe('geoEngine.getCachedMarkets union read', () => {
  let useLocationStore: any;
  let geoEngine: any;

  beforeAll(() => {
    useLocationStore = require('../store/useLocationStore').useLocationStore;
    geoEngine = require('../services/geoEngine').geoEngine;
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
    useLocationStore.setState({ cachedMarkets: [] });
  });

  it('returns the union of memory and disk, memory winning on id', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify([market('a', now), { ...market('b', now), name: 'Disk B' }])
    );
    useLocationStore.setState({
      cachedMarkets: [{ ...market('b', now), name: 'Memory B' }, market('c', now)],
    });

    const result = await geoEngine.getCachedMarkets();
    expect(result.map((m: any) => m.id).sort()).toEqual(['a', 'b', 'c']);
    expect(result.find((m: any) => m.id === 'b').name).toBe('Memory B');
  });

  it('filters expired disk entries on read', async () => {
    const now = Date.now();
    const expired = now - NOTIFICATION_CONSTANTS.CACHE_TTL_MS - 1000;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('old', expired), market('a', now)]));

    const result = await geoEngine.getCachedMarkets();
    expect(result.map((m: any) => m.id)).toEqual(['a']);
  });

  it('survives a headless start: disk only, empty memory', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([market('a', now)]));

    const result = await geoEngine.getCachedMarkets();
    expect(result.map((m: any) => m.id)).toEqual(['a']);
  });
});
