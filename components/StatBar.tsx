import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface StatBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

export default function StatBar({ label, value, color, icon }: StatBarProps) {
  const width = useSharedValue(value);

  React.useEffect(() => {
    width.value = withTiming(value, { duration: 600 });
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const isLow = value < 25;
  const isMedium = value < 50;

  const barColor = isLow ? Colors.danger : isMedium ? Colors.accent : color;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: barColor }]}>{Math.round(value)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            { backgroundColor: barColor },
            isLow && styles.barLow,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  icon: {
    fontSize: 13,
    marginRight: 6,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 3,
  },
  barLow: {
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
