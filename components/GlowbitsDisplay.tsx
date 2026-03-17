import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface FloatingReward {
  id: number;
  text: string;
}

interface Props {
  glowbits: number;
  rewardText?: string;
  rewardKey?: number;
}

export default function GlowbitsDisplay({ glowbits, rewardText, rewardKey }: Props) {
  const floatY = useSharedValue(0);
  const floatOpacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
    opacity: floatOpacity.value,
  }));

  useEffect(() => {
    if (!rewardText || !rewardKey) return;
    floatY.value = 0;
    floatOpacity.value = 1;
    floatY.value = withTiming(-40, { duration: 1000 });
    floatOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 900 })
    );
  }, [rewardKey]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.coin}>🪙</Text>
        <Text style={styles.amount}>{glowbits.toLocaleString()}</Text>
      </View>
      {rewardText ? (
        <Animated.View style={[styles.floatingReward, animStyle]} pointerEvents="none">
          <Text style={styles.floatingText}>{rewardText}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    position: "relative",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.accent + "60",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coin: {
    fontSize: 14,
  },
  amount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  floatingReward: {
    position: "absolute",
    top: -4,
    right: 0,
    backgroundColor: Colors.accent + "20",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  floatingText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
});
