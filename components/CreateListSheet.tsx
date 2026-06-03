import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
  Easing} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

// ── Animation configs ──
const PILL_HEIGHT = 160;
const SPRING_OPEN = { damping: 28, stiffness: 340, mass: 0.65 };
const SPRING_CLOSE = { damping: 24, stiffness: 300, mass: 0.6 };
const SPRING_SNAP = { damping: 20, stiffness: 260, mass: 0.5 };
const DISMISS_Y_RATIO = 0.28;
const DISMISS_VELOCITY = 500;

interface CreateListSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateList: (name: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CreateListSheet({
  visible,
  onClose,
  onCreateList}: CreateListSheetProps) {
  const insets = useSafeAreaInsets();

  // Shared values
  const translateY = useSharedValue(PILL_HEIGHT + 80);
  const scale = useSharedValue(0.92);
  const backdropOpacity = useSharedValue(0);
  const dragCtx = useSharedValue(0);
  const inputFocusAnim = useSharedValue(0);
  const btnActive = useSharedValue(0);
  const btnScale = useSharedValue(1);

  // State
  const inputRef = useRef<TextInput>(null);
  const [listName, setListName] = useState('');
  const [closing, setClosing] = useState(false);

  const hasText = listName.trim().length > 0;

  // ── Button active animation ──
  useEffect(() => {
    btnActive.value = withTiming(hasText ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic)});
  }, [hasText]);

  // ── Open ──
  const open = useCallback(() => {
    setClosing(false);
    translateY.value = withSpring(0, SPRING_OPEN);
    scale.value = withSpring(1, SPRING_OPEN);
    backdropOpacity.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic)});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ── Close ──
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    Keyboard.dismiss();
    translateY.value = withSpring(PILL_HEIGHT + 80, SPRING_CLOSE, (fin) => {
      if (fin) runOnJS(onDone)();
    });
    scale.value = withTiming(0.92, { duration: 220 });
    backdropOpacity.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.cubic)});
  }, [closing]);

  const onDone = useCallback(() => {
    setListName('');
    setClosing(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) open();
  }, [visible]);

  // ── Pan gesture (swipe down to dismiss) ──
  const pan = Gesture.Pan()
    .onStart(() => {
      dragCtx.value = translateY.value;
    })
    .onUpdate((e) => {
      const raw = dragCtx.value + e.translationY;
      translateY.value = raw < 0 ? raw * 0.1 : raw;
      backdropOpacity.value = interpolate(
        translateY.value,
        [0, PILL_HEIGHT],
        [1, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((e) => {
      if (
        translateY.value > PILL_HEIGHT * DISMISS_Y_RATIO ||
        e.velocityY > DISMISS_VELOCITY
      ) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, SPRING_SNAP);
        backdropOpacity.value = withTiming(1, { duration: 160 });
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

  // ── Animated styles ──
  const pillAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: interpolate(
      translateY.value,
      [0, PILL_HEIGHT * 0.9],
      [1, 0.4],
      Extrapolation.CLAMP,
    )}));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents:
      backdropOpacity.value > 0.01
        ? ('auto' as const)
        : ('none' as const)}));

  const inputBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputFocusAnim.value,
      [0, 1],
      ['#e8ecf0', '#0a7eff'],
    )}));

  const btnBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      btnActive.value,
      [0, 1],
      ['#eaeff4', '#0f172a'],
    ),
    transform: [{ scale: btnScale.value }]}));

  const btnText = useAnimatedStyle(() => ({
    color: interpolateColor(
      btnActive.value,
      [0, 1],
      ['#a0aec0', '#ffffff'],
    )}));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Floating pill */}
      <KeyboardAvoidingView
        style={styles.kavWrap}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.pill, pillAnim]}>
            {/* Drag handle */}
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

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
                    stiffness: 280});
                }}
                onPressOut={() => {
                  btnScale.value = withSpring(1, {
                    damping: 14,
                    stiffness: 280});
                }}
                style={[styles.createBtn, btnBg, hasText && styles.createBtnShadow]}
              >
                <Animated.Text style={[styles.createBtnLabel, btnText]}>
                  Create
                </Animated.Text>
              </AnimatedPressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)'},

  kavWrap: {
    flex: 1,
    justifyContent: 'flex-end'},

  // ── Floating pill card ──
  pill: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingBottom: 18,
    // Shadow

  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2},
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dfe4ea'},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 14},
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.35},
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'},

  // Input + Button in one row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10},
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#f8fafc'},
  input: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.1},

  // Create button
  createBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center'},
  createBtnShadow: {

  },
  createBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.05}});
