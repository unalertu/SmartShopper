# Floating Action Button Backup

If you ever want to restore the `+` button and its associated popup menu to your bottom tab bar, here is all the code that was removed from `app/(tabs)/_layout.tsx`.

## 1. Components
Add these components below the `TabItem` component:

```tsx
// ── Animated FAB ──
function FloatingActionButton({
  isOpen,
  onPress,
}: {
  isOpen: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isOpen ? 1 : 0, SPRING_CONFIG);
  }, [isOpen]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 135])}deg` },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, SPRING_CONFIG);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.fab}
    >
      <Animated.View style={iconStyle}>
        <Plus size={18} color="#fff" strokeWidth={2.5} />
      </Animated.View>
    </Pressable>
  );
}

// ── Animated Action Card ──
function ActionCard({
  icon: IconComponent,
  label,
  onPress,
  delay,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  delay: number;
}) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING_CONFIG);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.actionCard, cardStyle]}>
        <View style={styles.actionIconWrap}>
          <IconComponent size={22} color="#0f172a" strokeWidth={2} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
```

## 2. State and Variables
Add these to `TabLayout` and `CustomTabBar`:

```tsx
// Inside TabLayout:
const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
// Pass `isActionsMenuOpen` and `setIsActionsMenuOpen` to <CustomTabBar /> as props.

// Inside CustomTabBar:
const overlayOpacity = useSharedValue(0);

useEffect(() => {
  overlayOpacity.value = withTiming(isActionsMenuOpen ? 1 : 0, { duration: 250 });
}, [isActionsMenuOpen]);

const overlayStyle = useAnimatedStyle(() => ({
  opacity: overlayOpacity.value,
  pointerEvents: isActionsMenuOpen ? "auto" : "none",
}));

const actions = [
  { icon: PlusCircle, label: "New List", key: "new-list" },
  { icon: MapPin, label: "Add\nLocation", key: "add-loc" },
  { icon: CheckCircle, label: "Quick Add", key: "quick-add" },
  { icon: ScanBarcode, label: "Scan Item", key: "scan" },
];
```

## 3. JSX
Add the overlay and the button into the `CustomTabBar` return function:

```tsx
// 1. Place this BEFORE the "Navigation Bar Container" View
{/* Actions Menu Overlay */}
<Animated.View style={[styles.overlay, overlayStyle]}>
  <BlurView
    intensity={25}
    tint="dark"
    style={StyleSheet.absoluteFill}
  >
    <Pressable
      style={{ flex: 1 }}
      onPress={() => setIsActionsMenuOpen(false)}
    />
  </BlurView>

  <View style={styles.actionsGrid}>
    {actions.map((action, i) => (
      <ActionCard
        key={action.key}
        icon={action.icon}
        label={action.label}
        delay={i * 50}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsActionsMenuOpen(false);
        }}
      />
    ))}
  </View>
</Animated.View>

// 2. Place this INSIDE styles.navBarInner, after mapping over the tabs
{/* Floating Action Button */}
<FloatingActionButton
  isOpen={isActionsMenuOpen}
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActionsMenuOpen(!isActionsMenuOpen);
  }}
/>
```

## 4. Styles
Add these to the `styles = StyleSheet.create({...})` object:

```tsx
  // FAB
  fab: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  // Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 100,
  },

  // Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 40,
    gap: 14,
  },
  actionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    width: 100,
    height: 100,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 14,
  },
```
