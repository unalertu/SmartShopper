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
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

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
      // Delay focus slightly to allow the view to mount, then the native keyboard 
      // will perfectly push the KeyboardAvoidingView up as a single hardware animation.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      Keyboard.dismiss();
    }
  }, [visible]);

  const handleCreate = () => {
    const t = listName.trim();
    if (!t) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateList(t);
    onClose();
  };

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
      <Animated.View 
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(200)}
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
          entering={FadeInDown.duration(300).springify().damping(28).stiffness(340)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.pill, { marginBottom: insets.bottom > 0 ? insets.bottom : 16 }]}
        >
          <DragHandle />

          {/* Header row */}
          <View style={styles.header}>
            <Text style={styles.title}>New List</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
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
              style={[styles.createBtn, btnBg]}
            >
              <Animated.Text style={[styles.createBtnLabel, btnTextStyle]}>
                Create
              </Animated.Text>
            </AnimatedPressable>
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
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
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
    paddingTop: 8,
    paddingBottom: 20, // Increased spacing
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.35,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input + Button in one row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.1,
  },

  // Create button
  createBtn: {
    borderRadius: 14,
    paddingVertical: 14,
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
