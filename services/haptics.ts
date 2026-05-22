/**
 * Global haptic utility.
 * Checks the persisted hapticEnabled setting before firing any haptic feedback.
 */

import * as Haptics from "expo-haptics";
import { useSettingsStore } from "../store/useSettingsStore";

/** Fire an impact haptic only if haptics are enabled in settings. */
export const hapticImpact = (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): void => {
  const enabled = useSettingsStore.getState().hapticEnabled;
  if (!enabled) return;
  Haptics.impactAsync(style);
};

/** Fire a notification haptic only if haptics are enabled in settings. */
export const hapticNotification = (
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType
    .Success
): void => {
  const enabled = useSettingsStore.getState().hapticEnabled;
  if (!enabled) return;
  Haptics.notificationAsync(type);
};

/** Fire a selection haptic only if haptics are enabled in settings. */
export const hapticSelection = (): void => {
  const enabled = useSettingsStore.getState().hapticEnabled;
  if (!enabled) return;
  Haptics.selectionAsync();
};
