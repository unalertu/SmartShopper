import React from "react";
import { StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

export default function GradientBlurBackground() {
  return (
    <MaskedView
      style={StyleSheet.absoluteFill}
      maskElement={
        <LinearGradient
          colors={["rgba(0,0,0,1)", "rgba(0,0,0,1)", "rgba(0,0,0,0)"]}
          locations={[0, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
    >
      <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
    </MaskedView>
  );
}
