import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

function PixelDot({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.1, { duration: 800 }),
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        style,
        { left: x, top: y, backgroundColor: color },
      ]}
    />
  );
}

export default function PixelGrid() {
  const dots = React.useMemo(() => {
    const arr = [];
    const colors = [Colors.primary, Colors.accent, Colors.info, Colors.primary, Colors.primary];
    for (let i = 0; i < 18; i++) {
      arr.push({
        id: i,
        x: Math.random() * 340,
        y: Math.random() * 340,
        delay: Math.random() * 3000,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return arr;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {dots.map((d) => (
        <PixelDot key={d.id} delay={d.delay} x={d.x} y={d.y} color={d.color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  dot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 0.5,
  },
});
