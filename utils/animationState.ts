import { FadeIn } from 'react-native-reanimated';

const playedAnimations: Record<string, boolean> = {};

export function getEntering(id: string, defaultAnimation: any) {
  // The user requested to remove the one-time dropdown effect on the 3 pages.
  // We return an instant FadeIn to disable the effect without breaking Reanimated layouts.
  return FadeIn.duration(0);
}
