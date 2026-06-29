import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

interface ComingSoonSheetProps {
  visible: boolean;
  title: string;
  description: string;
  onDismiss: () => void;
}

const ComingSoonSheet = memo(function ComingSoonSheet({
  visible,
  title,
  description,
  onDismiss,
}: ComingSoonSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isSheetOpenRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isSheetOpenRef.current = true;
      setTimeout(() => {
        bottomSheetRef.current?.present();
      }, 50);
    } else {
      if (isSheetOpenRef.current) {
        bottomSheetRef.current?.dismiss();
        isSheetOpenRef.current = false;
      }
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    onDismiss();
  }, [onDismiss]);

  const dismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
      isSheetOpenRef.current = false;
    }
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
      />
    ),
    []
  );

  const modalName = React.useMemo(() => `coming-soon-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <BottomSheetModal
      name={modalName}
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={dismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Got it</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ComingSoonSheet;

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
