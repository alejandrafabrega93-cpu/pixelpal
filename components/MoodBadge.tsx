import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PetMood } from "@/context/PetContext";
import { Colors } from "@/constants/colors";
import { t, TranslationKeys } from "@/constants/i18n";

const MOOD_CONFIG: Record<PetMood, { key: TranslationKeys; color: string; icon: string }> = {
  ecstatic: { key: "moodEcstatic", color: Colors.primary, icon: "✦" },
  happy: { key: "moodHappy", color: "#60D090", icon: "♦" },
  neutral: { key: "moodOkay", color: Colors.accent, icon: "◆" },
  sad: { key: "moodSad", color: Colors.info, icon: "▼" },
  sick: { key: "moodSick", color: Colors.danger, icon: "✕" },
  sleeping: { key: "moodSleeping", color: Colors.textSecondary, icon: "~" },
};

interface MoodBadgeProps {
  mood: PetMood;
  lang: string;
}

export default function MoodBadge({ mood, lang }: MoodBadgeProps) {
  const config = MOOD_CONFIG[mood];
  return (
    <View style={[styles.badge, { borderColor: config.color + "55", backgroundColor: config.color + "18" }]}>
      <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{t(lang, config.key)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    fontSize: 10,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
