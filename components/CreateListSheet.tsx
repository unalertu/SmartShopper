import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
  withSpring,
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

function CreateListSheet({ visible, onClose, onCreateList }: CreateListSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [listName, setListName] = useState('');
  const hasText = listName.trim().length > 0;

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

  // Handle visibility and focus
  useEffect(() => {
    if (visible) {
      setListName('');
      // Focus quickly so the keyboard starts appearing while sheet animates
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      Keyboard.dismiss();
    }
  }, [visible]);

  const handleCreate = () => {
    const t = listName.trim();
    if (!t) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    requestAnimationFrame(() => {
      onCreateList(t);
    });
  };

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

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(320).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Keyboard Avoiding Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={FadeIn.duration(320).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.wrapper}
        >
          <View style={[styles.sheet, styles.content, { paddingBottom: 24 }]}>
            <View style={{ alignItems: 'center', width: '100%' }}>
              <View style={styles.handle} />
            </View>

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
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default memo(CreateListSheet);

// ── Styles ──
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    zIndex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  // Tight gap to the keyboard/bottom edge, matching RenameListSheet.
  wrapper: {
    marginHorizontal: 14,
    marginBottom: 6,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 19,
    paddingTop: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
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
  },
  createBtn: {
    borderRadius: 25,
    height: 54,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
});
