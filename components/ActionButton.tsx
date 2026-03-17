import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { playClick } from "@/utils/audio";

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  glowColor?: string;
  flex?: boolean;
  soundEnabled?: boolean;
}

export default function ActionButton({
  icon,
  label,
  onPress,
  disabled = false,
  color = Colors.primary,
  glowColor,
  flex = false,
  soundEnabled = true,
}: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSpring(0.88, { damping: 12, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (soundEnabled) playClick();
    onPress();
  };

  const glow = glowColor || color + "33";

  return (
    <Animated.View style={[animatedStyle, flex && { flex: 1 }]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          flex && styles.buttonFlex,
          { borderColor: disabled ? Colors.border : color + "55" },
          pressed && !disabled && { opacity: 0.85 },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: disabled ? Colors.border : color + "22", shadowColor: glow }]}>
          <Text style={[styles.icon, { opacity: disabled ? 0.4 : 1 }]}>{icon}</Text>
        </View>
        <Text style={[styles.label, { color: disabled ? Colors.textMuted : Colors.textSecondary }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: Colors.bgCard,
  },
  buttonFlex: {
    width: undefined,
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
