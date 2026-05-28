import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMapSearchProps<TRegion> {
  /**
   * Async function to fetch cluster data for the new region.
   */
  onFetchData: (region: TRegion) => Promise<void>;
  /**
   * Delay in ms to wait after map stops moving before fetching.
   * @default 500
   */
  debounceMs?: number;
  /**
   * Maximum time to show the indicator after fetch starts, to prevent getting stuck.
   * @default 2000
   */
  autoHideMs?: number;
}

export function useMapSearch<TRegion = any>({
  onFetchData,
  debounceMs = 500,
  autoHideMs = 2000,
}: UseMapSearchProps<TRegion>) {
  const [isSearching, setIsSearching] = useState(false);
  
  // Timers to handle debounce and fallback hiding
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Bind this to MapView's onRegionChange
   * Clears any pending fetches when the user starts moving the map again.
   */
  const onRegionChange = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  /**
   * Bind this to MapView's onRegionChangeComplete
   * Triggers the debounced fetch and shows the indicator.
   */
  const onRegionChangeComplete = useCallback(
    (region: TRegion) => {
      // Clear previous timer if user quickly stopped and started again
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        setIsSearching(true);
        
        // Start a fallback timer to forcefully hide the indicator if the fetch hangs
        // or just to fulfill the "fallback to hidden after 2 seconds" requirement.
        if (fallbackTimer.current) {
          clearTimeout(fallbackTimer.current);
        }
        
        fallbackTimer.current = setTimeout(() => {
          setIsSearching(false);
        }, autoHideMs);

        try {
          await onFetchData(region);
        } catch (error) {
          console.error("Map fetch error:", error);
        } finally {
          // Data arrived successfully or failed, hide indicator gracefully
          setIsSearching(false);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
          }
        }
      }, debounceMs);
    },
    [onFetchData, debounceMs, autoHideMs]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, []);

  return {
    isSearching,
    onRegionChange,
    onRegionChangeComplete,
  };
}
