import { useAnimatedScrollHandler } from "react-native-reanimated";
import { makeMutable } from "react-native-reanimated";

// ── Module-level singleton shared value ──
// Lives outside React — every import gets the same instance.
export const tabBarScrollY = makeMutable(0);

const lastScrollY = makeMutable(0);

// Reset scrollY (call on tab focus change)
export function resetTabBarScroll() {
  "worklet";
  tabBarScrollY.value = 0;
  lastScrollY.value = 0;
}

// ── Hook for scrollable screens ──
// Attach the returned handler to <Animated.ScrollView onScroll={handler}>
export function useTabBarScrollHandler() {
  const handler = useAnimatedScrollHandler({
    onScroll(event) {
      const currentY = event.contentOffset.y;
      
      // Don't do anything if we bounce past top
      if (currentY < 0) return;

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      // Accumulate delta and clamp between 0 (fully expanded) and 120 (fully shrunken)
      tabBarScrollY.value = Math.max(0, Math.min(120, tabBarScrollY.value + delta));
    },
  });
  return handler;
}
