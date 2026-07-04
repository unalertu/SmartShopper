import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

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
  const actionTakenRef = useRef(false);
  const isSheetOpenRef = useRef(false);

  useEffect(() => {
    if (visible) {
      actionTakenRef.current = false;
      isSheetOpenRef.current = true;
      bottomSheetRef.current?.present();
    } else {
      if (isSheetOpenRef.current) {
        bottomSheetRef.current?.dismiss();
        isSheetOpenRef.current = false;
      }
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    if (!actionTakenRef.current) {
      actionTakenRef.current = true;
      if (data?.onCancel) {
        data.onCancel();
      }
      onDismiss();
    }
  }, [data, onDismiss]);

  const dismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    actionTakenRef.current = true;
    if (data?.onCancel) data.onCancel();
    
    if (isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
      isSheetOpenRef.current = false;
    }
    onDismiss();
  }, [data, onDismiss]);

  const confirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actionTakenRef.current = true;
    if (data?.onConfirm) data.onConfirm();
    
    if (isSheetOpenRef.current) {
      bottomSheetRef.current?.dismiss();
      isSheetOpenRef.current = false;
    }
    onDismiss();
  }, [data, onDismiss]);

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

  const actionLabel = data?.confirmLabel || (data?.isEnabling ? 'Enable' : 'Disable');
  const title = data?.title || (data ? `${actionLabel} ${data.settingName}?` : '');
  const description = data?.description ?? '';

  const modalName = React.useMemo(() => `confirmation-sheet-${Math.random().toString(36).substr(2, 9)}`, []);

  const snapPoints = React.useMemo(() => [260], []);

  return (
    <BottomSheetModal
      name={modalName}
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
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
