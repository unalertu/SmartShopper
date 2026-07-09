/**
 * Overpass API Service
 * Handles mirror rotation and rate-limiting (429) / timeout (504) recovery.
 * When a mirror returns valid JSON but 0 results, we treat it as potentially
 * stale and try the next mirror before accepting the empty result.
 */

const MIRROR_POOL = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

let currentMirrorIndex = 0;

export interface MarketElement {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const fetchMarkets = async (
  south: number,
  west: number,
  north: number,
  east: number,
  signal?: AbortSignal,
  retriesPerMirror = 1
): Promise<MarketElement[]> => {
  const query = `[out:json][timeout:20];
(
  node["shop"~"supermarket|convenience|grocery|department_store"](${south},${west},${north},${east});
  way["shop"~"supermarket|convenience|grocery|department_store"](${south},${west},${north},${east});
  relation["shop"~"supermarket|convenience|grocery|department_store"](${south},${west},${north},${east});
  node["amenity"="pharmacy"](${south},${west},${north},${east});
  way["amenity"="pharmacy"](${south},${west},${north},${east});
  relation["amenity"="pharmacy"](${south},${west},${north},${east});
);
out center 600;`;

  console.log(`🔍 Overpass query bbox: S=${south.toFixed(4)} W=${west.toFixed(4)} N=${north.toFixed(4)} E=${east.toFixed(4)}`);

  let lastError: any = null;

  // Iterate a bounded, per-call mirror sequence. currentMirrorIndex is shared
  // module state and concurrent fetches (map fetches are no longer aborted on
  // pan) rotate it under each other — reading it every iteration made a call
  // re-attempt mirrors it had already tried, up to 25s per attempt, with no
  // upper bound while the interleaving persisted.
  const startIndex = currentMirrorIndex;

  for (let attempt = 0; attempt < MIRROR_POOL.length; attempt++) {
    const mirrorIndex = (startIndex + attempt) % MIRROR_POOL.length;
    const isLastMirror = attempt === MIRROR_POOL.length - 1;

    // Bail out early if the caller already aborted (e.g. new map pan)
    if (signal?.aborted) {
      const err = new DOMException('The operation was aborted.', 'AbortError');
      throw err;
    }

    const mirror = MIRROR_POOL[mirrorIndex];
    console.log(`📡 Fetching from Overpass mirror: ${mirror}`);

    try {
      // Use AbortController for timeout (25s) or external abort
      const controller = new AbortController();
      const onCallerAbort = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', onCallerAbort, { once: true });
        if (signal.aborted) controller.abort();
      }
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response: Response;
      try {
        // Use standard urlencoded format — most reliable across all mirrors
        response = await fetch(mirror, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        // Remove the listener to prevent leaks when the fetch completed normally
        if (signal) signal.removeEventListener('abort', onCallerAbort);
      }

      if (response.status === 429 || response.status === 504 || response.status === 502 || response.status === 403) {
        console.log(`📡 Mirror ${mirror} unavailable (${response.status}). Rotating...`);
        currentMirrorIndex = (mirrorIndex + 1) % MIRROR_POOL.length;
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        // Check if the response is HTML (error page) instead of JSON
        if (errText.includes('<html') || errText.includes('<!DOCTYPE') || errText.includes('runtime error')) {
          console.log(`📡 Mirror ${mirror} returned error page. Rotating...`);
          currentMirrorIndex = (mirrorIndex + 1) % MIRROR_POOL.length;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }

      // Check content-type to ensure we got JSON, not an HTML error page
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();

      if (!contentType.includes('json') && (responseText.includes('<html') || responseText.includes('runtime error'))) {
        console.log(`📡 Mirror ${mirror} returned HTML error instead of JSON. Rotating...`);
        currentMirrorIndex = (mirrorIndex + 1) % MIRROR_POOL.length;
        continue;
      }

      const data = JSON.parse(responseText);
      console.log(`✅ Overpass returned ${data?.elements?.length ?? 0} elements from ${mirror}`);

      // Detect stale/broken mirrors: valid JSON but suspiciously empty results
      // AND the timestamp looks invalid (not a proper ISO date)
      if (data && data.elements && data.elements.length === 0) {
        const timestamp = data?.osm3s?.timestamp_osm_base || '';
        const isValidTimestamp = timestamp.includes('-') && timestamp.length > 10; // e.g. "2026-04-13T12:43:14Z"

        if (!isValidTimestamp && !isLastMirror) {
          console.log(`⚠️ Mirror ${mirror} returned 0 results with suspicious timestamp "${timestamp}". Trying next mirror...`);
          currentMirrorIndex = (mirrorIndex + 1) % MIRROR_POOL.length;
          continue;
        }
      }

      // Remember the mirror that answered so the next call starts here
      currentMirrorIndex = mirrorIndex;

      if (data && data.elements) {
        const results = data.elements
          .map((el: any) => ({
            id: el.id.toString(),
            name: el.tags?.name || 'Local Store',
            latitude: el.lat ?? el.center?.lat,
            longitude: el.lon ?? el.center?.lon,
          }))
          .filter((m: MarketElement) => m.latitude != null && m.longitude != null);
        
        console.log(`📍 ${results.length} stores with valid coordinates`);
        return results;
      }
      
      return [];
    } catch (error: any) {
      // If the caller's signal was aborted (map pan), stop immediately — don't rotate
      if (signal?.aborted) {
        throw error;
      }
      lastError = error;
      const reason = error.name === 'AbortError' ? 'timeout (25s)' : error.message;
      console.log(`🔁 Rotating mirror due to ${reason} on ${mirror}`);
      currentMirrorIndex = (mirrorIndex + 1) % MIRROR_POOL.length;
    }
  }

  throw lastError || new Error("All Overpass mirrors failed or are rate-limited.");
};
