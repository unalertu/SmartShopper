import React, { useState, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useInteractionReady() {
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });

      return () => task.cancel();
    }, [])
  );

  return isReady;
}
