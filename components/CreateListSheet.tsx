import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Keyboard, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor, Easing, withSpring, ReduceMotion } from 'react-native-reanimated';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CreateListSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateList: (name: string) => void;
}

const CreateListSheet = memo(({ visible, onClose, onCreateList }: CreateListSheetProps) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const inputRef = useRef<any>(null);
  const isSheetOpenRef = useRef(false);

  const [listName, setListName] = useState('');
  const hasText = listName.trim().length > 0;

  // Keep stable refs for callbacks
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onCreateListRef = useRef(onCreateList);
  onCreateListRef.current = onCreateList;

  const inputFocusAnim = useSharedValue(0);
  const btnActive = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    btnActive.value = withTiming(hasText ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [hasText]);

  useEffect(() => {
    if (visible) {
      setListName('');
      isSheetOpenRef.current = true;
      bottomSheetRef.current?.present();
    } else if (isSheetOpenRef.current) {
      Keyboard.dismiss();
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Focus right as the sheet begins its opening animation so the keyboard
  // and sheet animate together instead of the keyboard appearing afterward.
  const handleSheetAnimate = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === -1 && toIndex >= 0) {
      inputRef.current?.focus();
    }
  }, []);

  const handleDismiss = useCallback(() => {
    isSheetOpenRef.current = false;
    Keyboard.dismiss();
    onCloseRef.current();
  }, []);

  const handleCreate = useCallback(() => {
    const t = listName.trim();
    if (!t) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
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

  const snapPoints = useMemo(() => [250], []);

  const animationConfigs = useMemo(
    () => ({
      damping: 32,
      stiffness: 180,
      mass: 0.8,
      overshootClamping: true,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      reduceMotion: ReduceMotion.System,
    }),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      detached={true}
      bottomInset={Platform.OS === 'ios' ? 24 : 8}
      style={{ marginHorizontal: 14 }}
      enablePanDownToClose
      animateOnMount
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      onAnimate={handleSheetAnimate}
      handleComponent={null}
      backgroundStyle={{ backgroundColor: 'transparent', elevation: 0 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={{ paddingBottom: 16, backgroundColor: 'transparent' }}>
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
            <BottomSheetTextInput
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
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default CreateListSheet;

const styles = StyleSheet.create({
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
