import type { Router } from "expo-router";
import { useSettingsStore } from "../store/useSettingsStore";
import { useListsStore } from "../store/useListsStore";

/**
 * Single destination for every notification tap — the OS notification
 * response path (app/_layout) and the in-app foreground banner both route
 * through here so they can never behave differently.
 *
 * Guards: waits for the lists store to hydrate (cold start), never hijacks
 * onboarding, and never opens a list that no longer exists.
 */
export const openNotificationList = (router: Router, listId: number): void => {
  const openList = () => {
    if (!useSettingsStore.getState().hasCompletedOnboarding) return;
    if (!useListsStore.getState().lists.some((l) => l.id === listId)) return;
    router.push(`/list/${listId}`);
  };

  if (useListsStore.persist.hasHydrated()) {
    openList();
  } else {
    const unsub = useListsStore.persist.onFinishHydration(() => {
      unsub();
      openList();
    });
  }
};
