import { MarketElement } from './overpassService';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface CacheEntry {
  timestamp: number;
  stores: MarketElement[];
}

const MAX_CACHE_SIZE = 12;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

const DEBUG_MODE = true;
const HARD_STORE_LIMIT = 15000;

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encodes a latitude and longitude into a geohash string.
 */
function encodeGeohash(latitude: number, longitude: number, precision: number = 6): string {
  let isEven = true;
  let lat = [-90.0, 90.0];
  let lon = [-180.0, 180.0];
  let bit = 0;
  let ch = 0;
  let geohash = "";

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lon[0] + lon[1]) / 2;
      if (longitude > mid) {
        ch |= (1 << (4 - bit));
        lon[0] = mid;
      } else {
        lon[1] = mid;
      }
    } else {
      const mid = (lat[0] + lat[1]) / 2;
      if (latitude > mid) {
        ch |= (1 << (4 - bit));
        lat[0] = mid;
      } else {
        lat[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

class MapCacheManager {
  private cache: Map<string, CacheEntry> = new Map();

  private getTotalStores(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.stores.length;
    }
    return total;
  }

  private monitorCache(): void {
    const totalStores = this.getTotalStores();
    if (DEBUG_MODE) {
      console.log(`[MapCacheManager] Monitor: ${this.cache.size} regions cached. ` +
                  `Approx Memory: ${(totalStores * 1).toLocaleString()} KB (${totalStores} stores)`);
    }
  }

  /**
   * Converts map region into a stable cache key using geohash_6.
   * Geohash precision 6 is roughly 1.2km x 0.6km, which is good for district-level caching.
   */
  getRegionKey(region: Region): string {
    return encodeGeohash(region.latitude, region.longitude, 6);
  }

  /**
   * Returns cached stores if they exist and are within the TTL.
   * Does NOT refetch unless TTL expired. Returns null if not exists or expired.
   */
  getStoresForRegion(region: Region): MarketElement[] | null {
    const key = this.getRegionKey(region);
    const entry = this.cache.get(key);

    if (!entry) {
      if (DEBUG_MODE) console.log(`[MapCacheManager] Cache MISS for region: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > TTL_MS) {
      // TTL expired
      if (DEBUG_MODE) console.log(`[MapCacheManager] Cache EXPIRED for region: ${key}`);
      this.cache.delete(key);
      return null;
    }

    if (DEBUG_MODE) console.log(`[MapCacheManager] Cache HIT for region: ${key}`);

    // Refresh LRU order by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.stores;
  }

  /**
   * Stores the fetched data for the region in the cache.
   * Enforces the LRU max regions limit (8-12) and evicts the oldest unused region.
   */
  setStoresForRegion(region: Region, data: MarketElement[]): void {
    const key = this.getRegionKey(region);
    
    // Remove if exists to update LRU position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    this.cache.set(key, {
      timestamp: Date.now(),
      stores: data
    });

    // Hard safety rule: aggressively evict oldest regions if total stores exceed limit
    let totalStores = this.getTotalStores();
    while (totalStores > HARD_STORE_LIMIT && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const entryToEvict = this.cache.get(oldestKey);
        if (entryToEvict) {
          totalStores -= entryToEvict.stores.length;
        }
        if (DEBUG_MODE) console.log(`[MapCacheManager] Evicting region ${oldestKey} due to HARD_STORE_LIMIT.`);
        this.cache.delete(oldestKey);
      }
    }

    // Normal LRU eviction logic: When limit exceeded, remove oldest unused region
    while (this.cache.size > MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        if (DEBUG_MODE) console.log(`[MapCacheManager] Evicting region ${oldestKey} due to MAX_CACHE_SIZE.`);
        this.cache.delete(oldestKey);
      }
    }

    this.monitorCache();
  }

  /**
   * Clears the entire cache (useful for memory management or force resets).
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const mapCacheManager = new MapCacheManager();
