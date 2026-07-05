import React, { useState, useCallback } from 'react';
import { InteractionManager, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

export default function DelayedRender({ children, fallback = <View style={{ flex: 1 }} /> }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => {
        setIsReady(false);
        task.cancel();
      };
    }, [])
  );

  return isReady ? <>{children}</> : <>{fallback}</>;
}
