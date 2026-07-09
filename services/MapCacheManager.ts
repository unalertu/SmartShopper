import { MarketElement } from './overpassService';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface StoreBBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface CacheEntry {
  timestamp: number;
  stores: MarketElement[];
  /** The bbox the stores were actually fetched for — may be smaller than a later viewport at the same center. */
  bbox: StoreBBox;
}

/** Minimum fraction of the requested viewport a cached bbox must cover to count as a hit. */
export const COVERAGE_HIT_RATIO = 0.9;

export function regionToBBox(region: Region): StoreBBox {
  return {
    south: region.latitude - region.latitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
    north: region.latitude + region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
  };
}

/** Fraction (0..1) of `target`'s area that `cover` overlaps, computed in plain degrees. */
export function bboxCoverageRatio(cover: StoreBBox, target: StoreBBox): number {
  const targetArea =
    Math.max(0, target.north - target.south) * Math.max(0, target.east - target.west);
  if (targetArea === 0) return 1;
  const overlapLat = Math.min(cover.north, target.north) - Math.max(cover.south, target.south);
  const overlapLon = Math.min(cover.east, target.east) - Math.max(cover.west, target.west);
  if (overlapLat <= 0 || overlapLon <= 0) return 0;
  return (overlapLat * overlapLon) / targetArea;
}

const MAX_CACHE_SIZE = 12;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

const DEBUG_MODE = __DEV__;
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
    if (!DEBUG_MODE) return;
    const totalStores = this.getTotalStores();
    console.log(`[MapCacheManager] Monitor: ${this.cache.size} regions cached. ` +
                `Approx Memory: ${(totalStores * 1).toLocaleString()} KB (${totalStores} stores)`);
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

    // The entry may have been fetched for a much smaller viewport (zoomed in)
    // than the one now requested at the same center. Treat it as a miss so the
    // caller refetches the wider bbox — otherwise the outer ring of the
    // viewport stays empty for the whole TTL. Keep the entry: it remains a
    // valid hit for zoomed-in visits until it is overwritten or expires.
    const coverage = bboxCoverageRatio(entry.bbox, regionToBBox(region));
    if (coverage < COVERAGE_HIT_RATIO) {
      if (DEBUG_MODE) {
        console.log(`[MapCacheManager] Cache UNDER-COVERS region ${key} ` +
                    `(${Math.round(coverage * 100)}% of viewport) — treating as miss`);
      }
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
  setStoresForRegion(region: Region, data: MarketElement[], bbox: StoreBBox): void {
    const key = this.getRegionKey(region);

    // Remove if exists to update LRU position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    this.cache.set(key, {
      timestamp: Date.now(),
      stores: data,
      bbox
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
