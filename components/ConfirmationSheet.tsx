import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export interface ConfirmationSheetData {
  settingName?: string;
  title?: string;
  description: string;
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onDismiss();
      }
    },
    [onDismiss]
  );

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (data?.onCancel) data.onCancel();
    bottomSheetModalRef.current?.dismiss();
  };

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (data?.onConfirm) data.onConfirm();
    bottomSheetModalRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.3}
      />
    ),
    []
  );

  const actionLabel = data?.confirmLabel || (data?.isEnabling ? 'Enable' : 'Disable');
  const title = data?.title || (data ? `${actionLabel} ${data.settingName}?` : '');
  const description = data?.description ?? '';

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['auto']}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={styles.handle}
      handleStyle={styles.handleRow}
      backgroundStyle={styles.backgroundStyle}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}
      >
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
  backgroundStyle: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
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
    height: 48,
    borderRadius: 24,
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
  destructiveButton: {
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
  },
});
