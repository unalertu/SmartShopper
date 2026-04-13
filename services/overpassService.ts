/**
 * Overpass API Service
 * Handles mirror rotation and rate-limiting (429) / timeout (504) recovery.
 */

const MIRROR_POOL = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
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
  retriesPerMirror = 1
): Promise<MarketElement[]> => {
  const query = `[out:json][timeout:60];
nwr["shop"~"supermarket|convenience"](${south},${west},${north},${east});
out center;`;

  let lastError: any = null;
  const attemptedMirrors = new Set<number>();

  while (attemptedMirrors.size < MIRROR_POOL.length) {
    const mirror = MIRROR_POOL[currentMirrorIndex];
    console.log(`📡 Fetching from Overpass mirror: ${mirror}`);

    try {
      const response = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'text/plain',
        },
        body: query,
      });

      if (response.status === 429 || response.status === 504 || response.status === 502) {
        console.log(`📡 Mirror ${mirror} busy (${response.status}). Rotating...`);
        attemptedMirrors.add(currentMirrorIndex);
        rotateMirror();
        continue; // Try next mirror immediately
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      
      if (data && data.elements) {
        return data.elements
          .map((el: any) => ({
            id: el.id.toString(),
            name: el.tags?.name || 'Local Store',
            latitude: el.lat ?? el.center?.lat,
            longitude: el.lon ?? el.center?.lon,
          }))
          .filter((m: MarketElement) => m.latitude != null && m.longitude != null);
      }
      
      return [];
    } catch (error: any) {
      lastError = error;
      console.log(`🔁 Rotating mirror due to error on ${mirror}:`, error.message);
      attemptedMirrors.add(currentMirrorIndex);
      rotateMirror();
    }
  }

  throw lastError || new Error("All Overpass mirrors failed or are rate-limited.");
};

const rotateMirror = () => {
  currentMirrorIndex = (currentMirrorIndex + 1) % MIRROR_POOL.length;
};
