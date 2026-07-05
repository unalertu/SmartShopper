import { FadeIn } from 'react-native-reanimated';

const playedAnimations: Record<string, boolean> = {};

export function getEntering(id: string, defaultAnimation: any) {
  if (!playedAnimations[id]) {
    playedAnimations[id] = true;
    return defaultAnimation;
  }
  // Return an instant animation to prevent Reanimated from glitching/flickering
  // while ensuring the animation doesn't repeat.
  return FadeIn.duration(0);
}
