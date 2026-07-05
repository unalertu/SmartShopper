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

export interface ConfirmationSheetRef {
  present: (data?: ConfirmationSheetData) => void;
  dismiss: () => void;
}

interface ConfirmationSheetProps {
  visible?: boolean;
  data?: ConfirmationSheetData | null;
  onDismiss?: () => void;
}

const ConfirmationSheet = memo(React.forwardRef<ConfirmationSheetRef, ConfirmationSheetProps>(function ConfirmationSheet({
  visible = false,
  data: propData = null,
  onDismiss,
}, ref) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const actionTakenRef = useRef<'confirm' | 'cancel' | null>(null);
  const isSheetOpenRef = useRef(false);

  const [internalData, setInternalData] = React.useState<ConfirmationSheetData | null>(propData);

  // Keep stable refs for callbacks so handlers never go stale
  const dataRef = useRef(internalData);
  dataRef.current = internalData;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  React.useImperativeHandle(ref, () => ({
    present: (data?: ConfirmationSheetData) => {
      if (data) {
        setInternalData(data);
      }
      actionTakenRef.current = null;
      isSheetOpenRef.current = true;
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    }
  }));

  useEffect(() => {
    if (propData !== undefined) {
      setInternalData(propData);
    }
  }, [propData]);

  useEffect(() => {
    if (visible && internalData) {
      actionTakenRef.current = null;
      isSheetOpenRef.current = true;
      bottomSheetRef.current?.present();
    } else if (!visible && isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, internalData]);

  // Called by BottomSheetModal AFTER dismiss animation completes
  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    const action = actionTakenRef.current;

    if (action === 'confirm') {
      dataRef.current?.onConfirm?.();
    } else {
      dataRef.current?.onCancel?.();
    }

    actionTakenRef.current = null;
    // Notify parent AFTER animation is done
    onDismissRef.current();
  }, []);

  const dismiss = useCallback(() => {
    if (!isSheetOpenRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    actionTakenRef.current = 'cancel';
    bottomSheetRef.current?.dismiss();
  }, []);

  const confirm = useCallback(() => {
    if (!isSheetOpenRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actionTakenRef.current = 'confirm';
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

  const actionLabel = internalData?.confirmLabel || (internalData?.isEnabling ? 'Enable' : 'Disable');
  const title = internalData?.title || (internalData ? `${actionLabel} ${internalData.settingName}?` : '');
  const description = internalData?.description ?? '';

  const modalName = useMemo(() => `confirmation-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  const snapPoints = useMemo(() => [210], []);

  const animationConfigs = useMemo(
    () => ({
      damping: 28,
      stiffness: 280,
      mass: 0.7,
      overshootClamping: true,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      reduceMotion: ReduceMotion.System,
    }),
    []
  );

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
              internalData?.isDestructive && styles.destructiveButton,
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
}));

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
