import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { usePet } from "@/context/PetContext";

function NestEgg({ size }: { size: number }) {
  const s = size;
  const cx = s * 0.5;
  const cy = s * 0.46;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {/* Nest */}
      <Ellipse cx={cx} cy={s * 0.82} rx={s * 0.44} ry={s * 0.13} fill="#1A2C1A" />
      <Path
        d={`M ${cx - s * 0.4} ${s * 0.82} Q ${cx - s * 0.28} ${s * 0.74} ${cx - s * 0.12} ${s * 0.78}`}
        stroke="#243A24" strokeWidth={s * 0.035} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx + s * 0.4} ${s * 0.82} Q ${cx + s * 0.28} ${s * 0.74} ${cx + s * 0.12} ${s * 0.78}`}
        stroke="#243A24" strokeWidth={s * 0.035} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx - s * 0.28} ${s * 0.8} Q ${cx} ${s * 0.7} ${cx + s * 0.28} ${s * 0.8}`}
        stroke="#2E4A2E" strokeWidth={s * 0.03} fill="none" strokeLinecap="round"
      />
      {/* Egg glow */}
      <Ellipse cx={cx} cy={cy + s * 0.02} rx={s * 0.28} ry={s * 0.34} fill={Colors.primary + "15"} />
      {/* Egg */}
      <Ellipse cx={cx} cy={cy} rx={s * 0.24} ry={s * 0.3} fill="#1E3555" />
      <Ellipse cx={cx} cy={cy} rx={s * 0.22} ry={s * 0.28} fill="#243E68" />
      {/* Speckles */}
      <Circle cx={cx - s * 0.07} cy={cy - s * 0.08} r={s * 0.022} fill={Colors.primary + "55"} />
      <Circle cx={cx + s * 0.06} cy={cy + s * 0.06} r={s * 0.016} fill={Colors.primary + "44"} />
      <Circle cx={cx + s * 0.1} cy={cy - s * 0.04} r={s * 0.014} fill={Colors.accent + "55"} />
      <Circle cx={cx - s * 0.04} cy={cy + s * 0.12} r={s * 0.012} fill={Colors.primary + "44"} />
      {/* Shine */}
      <Ellipse cx={cx - s * 0.07} cy={cy - s * 0.1} rx={s * 0.055} ry={s * 0.07} fill="rgba(255,255,255,0.12)" />
    </Svg>
  );
}

export default function CreateScreen() {
  const [name, setName] = useState("");
  const { createPet } = usePet();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  const handleCreate = () => {
    if (!name.trim()) return;
    scale.value = withSequence(
      withSpring(1.12, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      createPet(name.trim());
      router.replace("/(tabs)");
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: topPad }]}>
        <LinearGradient
          colors={["#131E2E", Colors.bg]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.content, { paddingBottom: bottomPad + 24 }]}>
          <View style={styles.topSection}>
            <Text style={styles.title}>A Mystery Egg</Text>
            <Text style={styles.subtitle}>
              Something is about to hatch...{"\n"}give it a name first.
            </Text>

            <Animated.View style={[styles.eggWrap, eggStyle]}>
              <NestEgg size={220} />
              <View style={styles.eggGlowOuter} />
            </Animated.View>

            <View style={styles.hintRow}>
              <View style={styles.hintDot} />
              <Text style={styles.hint}>Once named, tap the egg to hatch it</Text>
              <View style={styles.hintDot} />
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.nameLabel}>NAME YOUR COMPANION</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter a name..."
              placeholderTextColor={Colors.textMuted}
              maxLength={16}
              returnKeyType="done"
              autoCapitalize="words"
              onSubmitEditing={handleCreate}
            />

            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                !name.trim() && styles.createButtonDisabled,
                pressed && name.trim() && { opacity: 0.88, transform: [{ scale: 0.97 as number }] },
              ]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <LinearGradient
                colors={
                  name.trim()
                    ? [Colors.primary, Colors.primaryDark]
                    : [Colors.border, Colors.border]
                }
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text
                  style={[
                    styles.createText,
                    !name.trim() && { color: Colors.textMuted },
                  ]}
                >
                  Place in Nest
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    justifyContent: "space-between",
  },
  topSection: { alignItems: "center" },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  eggWrap: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  eggGlowOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary + "08",
    borderWidth: 1,
    borderColor: Colors.primary + "15",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  hintDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary + "60",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textAlign: "center",
  },
  bottomSection: { gap: 14 },
  nameLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  nameInput: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  createButton: { borderRadius: 16, overflow: "hidden" },
  createButtonDisabled: { opacity: 0.5 },
  createGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});
