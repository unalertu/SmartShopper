import React, { memo, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';

export interface ConfirmationSheetData {
  settingName?: string;
  title?: string;
  description: string | React.ReactNode;
  isEnabling?: boolean;
  isDestructive?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmationSheetProps {
  visible: boolean;
  data: ConfirmationSheetData | null;
  onDismiss: () => void;
}

const ConfirmationSheet = memo(function ConfirmationSheet({
  visible,
  data,
  onDismiss,
}: ConfirmationSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const actionTakenRef = useRef<'confirm' | 'cancel' | null>(null);
  const isSheetOpenRef = useRef(false);

  // Keep stable refs for callbacks to avoid re-creating handlers on every render
  const dataRef = useRef(data);
  dataRef.current = data;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible && data) {
      actionTakenRef.current = null;
      // Use requestAnimationFrame to avoid presenting during a layout pass
      requestAnimationFrame(() => {
        isSheetOpenRef.current = true;
        bottomSheetRef.current?.present();
      });
    } else if (!visible && isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, data]);

  // This is the ONLY place where state cleanup happens — after the dismiss animation completes
  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    const action = actionTakenRef.current;

    if (action === 'confirm') {
      dataRef.current?.onConfirm?.();
    } else {
      // cancel or swipe-down
      dataRef.current?.onCancel?.();
    }

    // Reset for next use
    actionTakenRef.current = null;
    // Notify parent to set visible=false — this happens AFTER animation is done
    onDismissRef.current();
  }, []);

  const dismiss = useCallback(() => {
    if (!isSheetOpenRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    actionTakenRef.current = 'cancel';
    // Only dismiss the modal — the handleDismiss callback will do the rest
    bottomSheetRef.current?.dismiss();
  }, []);

  const confirm = useCallback(() => {
    if (!isSheetOpenRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actionTakenRef.current = 'confirm';
    // Only dismiss the modal — the handleDismiss callback will do the rest
    bottomSheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    []
  );

  const actionLabel = data?.confirmLabel || (data?.isEnabling ? 'Enable' : 'Disable');
  const title = data?.title || (data ? `${actionLabel} ${data.settingName}?` : '');
  const description = data?.description ?? '';

  const modalName = useMemo(() => `confirmation-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  const snapPoints = useMemo(() => [260], []);

  const animationConfigs = useMemo(
    () => ({
      damping: 20,
      stiffness: 200,
      mass: 0.8,
      overshootClamping: false,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.1,
      reduceMotion: ReduceMotion.System,
    }),
    []
  );

  // Don't mount the modal at all when there's no data — prevents ghost instances
  if (!data) return null;

  return (
    <BottomSheetModal
      name={modalName}
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      animateOnMount
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={dismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              data?.isDestructive && styles.destructiveButton,
            ]}
            onPress={confirm}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ConfirmationSheet;

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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#1e293b',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  destructiveButton: {
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
