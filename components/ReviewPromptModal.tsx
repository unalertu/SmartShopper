/**
 * Custom pre-prompt shown before the native review dialog. When the smart
 * review gate decides the user is eligible (see services/reviewService), this
 * friendly popup asks first. Only "Rate GeoCart" proceeds to the native
 * StoreReview dialog and counts the request against the 90-day / 3-lifetime
 * limits; "Not Now" simply dismisses.
 */
import React, { useCallback } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { ImpactFeedbackStyle } from "expo-haptics";
import { hapticImpact } from "../services/haptics";
import { useReviewStore } from "../store/useReviewStore";
import { confirmReviewRequest, dismissReviewPrompt } from "../services/reviewService";
import { Colors } from "../constants/theme";

export default function ReviewPromptModal() {
  const visible = useReviewStore((s) => s.isPromptVisible);

  const handleRate = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    void confirmReviewRequest();
  }, []);

  const handleNotNow = useCallback(() => {
    hapticImpact(ImpactFeedbackStyle.Light);
    dismissReviewPrompt();
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleNotNow}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Star size={28} color={Colors.white} fill={Colors.white} />
          </View>

          <Text style={styles.title}>Enjoying GeoCart?</Text>
          <Text style={styles.message}>
            Your feedback helps us improve GeoCart and helps other shoppers
            discover the app.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={handleRate}
          >
            <Text style={styles.primaryText}>Rate GeoCart</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handleNotNow}
          >
            <Text style={styles.secondaryText}>Not Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.surface[900],
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.surface[500],
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.surface[500],
  },
});
