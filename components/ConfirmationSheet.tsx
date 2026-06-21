import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const SHEET_HEIGHT = 200;
const SPRING_CONFIG = { damping: 28, stiffness: 340, mass: 0.65 };
const SPRING_DISMISS = { damping: 24, stiffness: 300, mass: 0.6 };
const DISMISS_VELOCITY = 400;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
  const translateY = useSharedValue(SHEET_HEIGHT + 60);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  // Track whether the component should be mounted at all
  const [mounted, setMounted] = useState(false);

  const handleFullyDismissed = () => {
    setMounted(false);
    onDismiss();
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Small delay to ensure mount before animating in
      requestAnimationFrame(() => {
        backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
        translateY.value = withSpring(0, SPRING_CONFIG);
      });
    } else if (mounted) {
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      translateY.value = withSpring(SHEET_HEIGHT + 60, SPRING_DISMISS, () => {
        runOnJS(handleFullyDismissed)();
      });
    }
  }, [visible]);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (data?.onCancel) data.onCancel();
    backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
    translateY.value = withSpring(SHEET_HEIGHT + 60, SPRING_DISMISS, () => {
      runOnJS(handleFullyDismissed)();
    });
  };

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (data?.onConfirm) data.onConfirm();
    backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
    translateY.value = withSpring(SHEET_HEIGHT + 60, SPRING_DISMISS, () => {
      runOnJS(handleFullyDismissed)();
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value + event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 50 || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Don't render anything when fully dismissed
  if (!mounted) return null;

  const actionLabel = data?.confirmLabel || (data?.isEnabling ? 'Enable' : 'Disable');
  const title = data?.title || (data ? `${actionLabel} ${data.settingName}?` : '');
  const description = data?.description ?? '';

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={dismiss}
    >
      {/* Backdrop */}
      <AnimatedTouchableOpacity
        style={[styles.backdrop, backdropStyle]}
        onPress={dismiss}
        activeOpacity={1}
      />

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Buttons */}
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
                data?.isDestructive && styles.destructiveButton
              ]}
              onPress={confirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
});

export default ConfirmationSheet;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 998,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 999,
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
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24, // Pill shape
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
    backgroundColor: '#1e293b', // Softer navy
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
    backgroundColor: '#0f172a', // Darker navy (slate-900) for destructive actions
    shadowColor: '#0f172a',
  },
});
