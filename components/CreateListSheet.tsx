import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CreateListSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateList: (name: string) => void;
}

const DragHandle = memo(() => (
  <View style={styles.handleRow}>
    <View style={styles.handle} />
  </View>
));

function CreateListSheet({
  visible,
  onClose,
  onCreateList,
}: CreateListSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [listName, setListName] = useState('');
  // Internal mounted state — stays true during exit animation
  const [mounted, setMounted] = useState(false);
  const hasText = listName.trim().length > 0;

  // Keep stable refs for callbacks
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onCreateListRef = useRef(onCreateList);
  onCreateListRef.current = onCreateList;

  const inputFocusAnim = useSharedValue(0);
  const btnActive = useSharedValue(0);
  const btnScale = useSharedValue(1);

  // Animate button color when text changes
  useEffect(() => {
    btnActive.value = withTiming(hasText ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [hasText]);

  // Handle visibility — mount/unmount with animation support
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setListName('');
      setTimeout(() => inputRef.current?.focus(), 80);
    } else if (mounted) {
      // Keyboard dismiss first, then let exit animation play
      Keyboard.dismiss();
      // mounted stays true — the exit animation callback will set it false
    }
  }, [visible]);

  const handleExitComplete = useCallback(() => {
    // Called after exit animation finishes
    setMounted(false);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onCloseRef.current();
  }, []);

  const handleCreate = useCallback(() => {
    const t = listName.trim();
    if (!t) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Close first (starts dismiss animation), then create the list after a frame
    // so the heavy state update doesn't block the animation
    onCloseRef.current();
    requestAnimationFrame(() => {
      onCreateListRef.current(t);
    });
  }, [listName]);

  const inputBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputFocusAnim.value,
      [0, 1],
      ['#e8ecf0', Colors.primary[900]],
    ),
  }));

  const btnBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      btnActive.value,
      [0, 1],
      ['#f1f5f9', '#0f172a'],
    ),
    transform: [{ scale: btnScale.value }],
  }));

  const btnTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      btnActive.value,
      [0, 1],
      ['#a0aec0', '#ffffff'],
    ),
  }));

  // Don't render anything if never opened or after exit animation completes
  if (!mounted && !visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      {visible && (
        <Animated.View
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(220)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
      )}

      {/* Keyboard Avoiding Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
        pointerEvents="box-none"
      >
        {visible && (
          <Animated.View
            entering={SlideInDown.duration(350).easing(Easing.out(Easing.exp))}
            exiting={SlideOutDown.duration(250).easing(Easing.in(Easing.cubic)).withCallback((finished) => {
              'worklet';
              if (finished) {
                runOnJS(handleExitComplete)();
              }
            })}
            style={[styles.pill, { marginBottom: 8 }]}
          >
            <DragHandle />

            {/* Header row */}
            <View style={styles.header}>
              <Text style={styles.title}>New List</Text>
            </View>

            {/* Input + Button row */}
            <View style={styles.actionRow}>
              <Animated.View style={[styles.inputWrap, inputBorder]}>
                <TextInput
                  ref={inputRef}
                  value={listName}
                  onChangeText={setListName}
                  placeholder="List name..."
                  placeholderTextColor="#cbd5e1"
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  autoCorrect={false}
                  maxLength={40}
                  selectionColor={Colors.primary[900]}
                  cursorColor={Colors.primary[900]}
                  onFocus={() => {
                    inputFocusAnim.value = withTiming(1, { duration: 200 });
                  }}
                  onBlur={() => {
                    inputFocusAnim.value = withTiming(0, { duration: 260 });
                  }}
                />
              </Animated.View>

              <AnimatedPressable
                onPress={handleCreate}
                disabled={!hasText}
                onPressIn={() => {
                  btnScale.value = withSpring(0.92, {
                    damping: 14,
                    stiffness: 280,
                  });
                }}
                onPressOut={() => {
                  btnScale.value = withSpring(1, {
                    damping: 14,
                    stiffness: 280,
                  });
                }}
                style={[styles.createBtn, btnBg]}
              >
                <Animated.Text style={[styles.createBtnLabel, btnTextStyle]}>
                  Create
                </Animated.Text>
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export default memo(CreateListSheet);

// ── Styles ──
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  // ── Floating pill card ──
  pill: {
    marginHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 20, // Increased padding
    paddingBottom: 28,     // Increased padding
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 14,
  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#dfe4ea',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 19,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -2 }],
  },

  // Input + Button in one row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1, // Reduced to 1px for a cleaner, Apple-like look
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    height: 54,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.1,
    textAlignVertical: 'center',
  },

  // Create button
  createBtn: {
    borderRadius: 25,
    height: 54,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnShadow: {},
  createBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
});
