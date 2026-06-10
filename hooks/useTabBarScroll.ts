import { useAnimatedScrollHandler } from "react-native-reanimated";
import { makeMutable } from "react-native-reanimated";

// ── Module-level singleton shared value ──
// Lives outside React — every import gets the same instance.
export const tabBarScrollY = makeMutable(0);

// Reset scrollY (call on tab focus change)
export function resetTabBarScroll() {
  "worklet";
  tabBarScrollY.value = 0;
}

// ── Hook for scrollable screens ──
// Attach the returned handler to <Animated.ScrollView onScroll={handler}>
export function useTabBarScrollHandler() {
  const handler = useAnimatedScrollHandler({
    onScroll(event) {
      tabBarScrollY.value = event.contentOffset.y;
    },
  });
  return handler;
}
