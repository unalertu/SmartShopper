import React, { useEffect, useRef, useState, memo } from 'react';
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
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RenameListSheetProps {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onRenameList: (name: string) => void;
}

const DragHandle = memo(() => (
  <View style={styles.handleRow}>
    <View style={styles.handle} />
  </View>
));

function RenameListSheet({
  visible,
  initialName,
  onClose,
  onRenameList,
}: RenameListSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  
  const [listName, setListName] = useState(initialName);
  const hasText = listName.trim().length > 0 && listName.trim() !== initialName.trim();

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
      setListName(initialName);
      // Focus quickly so the keyboard starts appearing while sheet animates
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      Keyboard.dismiss();
    }
  }, [visible, initialName]);

  const handleRename = () => {
    const t = listName.trim();
    if (!t || !hasText) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onRenameList(t);
    onClose();
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
          style={[styles.pill, { marginBottom: 8 }]}
        >
          <DragHandle />

          {/* Header row */}
          <View style={styles.header}>
            <Text style={styles.title}>Rename List</Text>
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
                onSubmitEditing={handleRename}
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
              onPress={handleRename}
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
                Save
              </Animated.Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default memo(RenameListSheet);

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
  pill: {
    marginHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 14,
  },
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
    textAlignVertical: 'center',
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
