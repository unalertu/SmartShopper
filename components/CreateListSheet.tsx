import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
  Easing,
  useAnimatedKeyboard,
  KeyboardState,
  useAnimatedReaction,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

// ── Spring configs tuned for iOS-native feel ──
const SPRING_SHEET = { damping: 28, stiffness: 340, mass: 0.65 };
const SPRING_SNAP  = { damping: 20, stiffness: 260, mass: 0.5 };
const DISMISS_VELOCITY = 500;
const SWIPE_THRESHOLD = 35;

interface CreateListSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateList: (name: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ── Memoized static sub-components to prevent re-renders while typing ──
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
  const keyboard = useAnimatedKeyboard();

  // Bottom margin: when keyboard is closed, use safe area; when open, use a small gap
  const safeBottom = insets.bottom > 0 ? insets.bottom : 16;

  // ── Shared values ──
  // sheetProgress: 0 = fully hidden, 1 = fully open
  const sheetProgress = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const dragCtx = useSharedValue(0);
  const inputFocusAnim = useSharedValue(0);
  const btnActive = useSharedValue(0);
  const btnScale = useSharedValue(1);

  // ── React state ──
  const inputRef = useRef<TextInput>(null);
  const [listName, setListName] = useState('');
  const closingRef = useRef(false);

  const hasText = listName.trim().length > 0;

  // ── Button active color animation (UI thread) ──
  useEffect(() => {
    btnActive.value = withTiming(hasText ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [hasText]);

  // ── Open ──
  const open = useCallback(() => {
    closingRef.current = false;
    sheetProgress.value = 0;
    dragOffset.value = 0;

    sheetProgress.value = withSpring(1, SPRING_SHEET);

    setTimeout(() => inputRef.current?.focus(), 280);
  }, []);

  // ── Close ──
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();

    cancelAnimation(sheetProgress);
    sheetProgress.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    }, (fin) => {
      if (fin) runOnJS(onDone)();
    });
  }, []);

  const onDone = useCallback(() => {
    setListName('');
    closingRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) open();
  }, [visible]);

  // ── Pan gesture (swipe down to dismiss) ──
  const pan = Gesture.Pan()
    .onStart(() => {
      dragCtx.value = dragOffset.value;
    })
    .onUpdate((e) => {
      // Only allow downward drag (positive translationY)
      const raw = dragCtx.value + e.translationY;
      dragOffset.value = raw < 0 ? raw * 0.08 : raw;
    })
    .onEnd((e) => {
      if (
        dragOffset.value > SWIPE_THRESHOLD ||
        e.velocityY > DISMISS_VELOCITY
      ) {
        runOnJS(close)();
      } else {
        // Snap back
        dragOffset.value = withSpring(0, SPRING_SNAP);
      }
    });

  // ── Create ──
  const handleCreate = useCallback(() => {
    const t = listName.trim();
    if (!t) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateList(t);
    close();
  }, [listName, onCreateList, close]);

  // ── Animated styles (all run on UI thread) ──
  const pillAnim = useAnimatedStyle(() => {
    const kbHeight = Platform.OS === 'ios' ? keyboard.height.value : 0;

    // Bottom position: keyboard height determines where pill sits
    // When keyboard closed: pill sits at safeBottom from screen bottom
    // When keyboard open: pill sits right above keyboard with 8px gap
    const bottomWhenClosed = safeBottom;
    const bottomWhenOpen = kbHeight > 0 ? kbHeight + 8 : safeBottom;
    const currentBottom = kbHeight > 0 ? bottomWhenOpen : bottomWhenClosed;

    // Entrance animation: slide up from 60px below + fade in
    const enterTranslateY = interpolate(
      sheetProgress.value,
      [0, 1],
      [60, 0],
      Extrapolation.CLAMP,
    );

    const enterScale = interpolate(
      sheetProgress.value,
      [0, 1],
      [0.95, 1],
      Extrapolation.CLAMP,
    );

    const enterOpacity = interpolate(
      sheetProgress.value,
      [0, 0.4],
      [0, 1],
      Extrapolation.CLAMP,
    );

    // Drag offset fades opacity slightly
    const dragOpacity = interpolate(
      dragOffset.value,
      [0, 80],
      [1, 0.5],
      Extrapolation.CLAMP,
    );

    return {
      bottom: currentBottom,
      transform: [
        { translateY: enterTranslateY + dragOffset.value },
        { scale: enterScale },
      ],
      opacity: enterOpacity * dragOpacity,
    };
  });

  const backdropAnim = useAnimatedStyle(() => {
    const opacity = interpolate(
      sheetProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );

    // Also fade with drag
    const dragFade = interpolate(
      dragOffset.value,
      [0, 80],
      [1, 0.3],
      Extrapolation.CLAMP,
    );

    return {
      opacity: opacity * dragFade,
      pointerEvents:
        opacity > 0.01 ? ('auto' as const) : ('none' as const),
    };
  });

  const inputBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputFocusAnim.value,
      [0, 1],
      ['#e8ecf0', '#0a7eff'],
    ),
  }));

  const btnBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      btnActive.value,
      [0, 1],
      ['#eaeff4', '#0f172a'],
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

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Floating pill — positioned absolutely from bottom */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.pill, pillAnim]}>
          {/* Drag handle */}
          <DragHandle />

          {/* Header row */}
          <View style={styles.header}>
            <Text style={styles.title}>New List</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                close();
              }}
              style={styles.closeBtn}
              hitSlop={14}
            >
              <X size={14} color="#94a3b8" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Input + Button row */}
          <View style={styles.actionRow}>
            <Animated.View style={[styles.inputWrap, inputBorder]}>
              <TextInput
                ref={inputRef}
                value={listName}
                onChangeText={setListName}
                placeholder="List name..."
                placeholderTextColor="#b0bec5"
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                autoCorrect={false}
                maxLength={40}
                selectionColor="#0a7eff"
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
              style={[styles.createBtn, btnBg, hasText && styles.createBtnShadow]}
            >
              <Animated.Text style={[styles.createBtnLabel, btnTextStyle]}>
                Create
              </Animated.Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default memo(CreateListSheet);

// ── Styles ──
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },

  // ── Floating pill card ──
  pill: {
    position: 'absolute',
    left: 14,
    right: 14,
    // bottom is set dynamically via animated style
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingBottom: 18,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dfe4ea',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.35,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input + Button in one row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.1,
  },

  // Create button
  createBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnShadow: {},
  createBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
});
