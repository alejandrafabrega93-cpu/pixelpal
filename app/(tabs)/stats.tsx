import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, getTheme } from "@/constants/colors";
import { usePet } from "@/context/PetContext";
import { useGame } from "@/context/GameContext";
import { t } from "@/constants/i18n";
import { playClick } from "@/utils/audio";
import PetCreature from "@/components/PetCreature";

const SPECIES_FULL_NAMES = {
  glorp: "Glorp",
  zippix: "Zippix",
  nubble: "Nubble",
};

function PersonalityBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={pStyles.row}>
      <Text style={pStyles.label}>{label}</Text>
      <View style={pStyles.track}>
        <View style={[pStyles.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[pStyles.val, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  label: { width: 68, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  track: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  val: { width: 28, textAlign: "right", fontSize: 12, fontFamily: "Inter_700Bold" },
});

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={scStyles.card}>
      <Text style={[scStyles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={scStyles.label}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
  },
});

export default function StatsScreen() {
  const { pet, resetPet } = usePet();
  const { gameState } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const theme = getTheme(gameState.settings.highContrastMode);
  const lang = gameState.settings.language;

  if (!pet) return null;

  const handleReset = () => {
    Alert.alert(
      `${t(lang, "sayGoodbye")} ${pet.name}?`,
      `${pet.name} ${t(lang, "petLeaveMessage")}`,
      [
        { text: t(lang, "stayBtn"), style: "cancel" },
        {
          text: t(lang, "sayGoodbyeBtn"),
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetPet();
            router.replace("/create");
          },
        },
      ]
    );
  };

  const born = new Date(pet.born);
  const bornStr = born.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getStageNext = () => {
    const map: Record<string, string> = {
      egg: `${t(lang, "stageBaby")} (at 1m)`,
      baby: `${t(lang, "stageChild")} (at 5m)`,
      child: `${t(lang, "stageTeen")} (at 15m)`,
      teen: `${t(lang, "stageAdult")} (at 45m)`,
      adult: `${t(lang, "stageAdult")} (at 2h)`,
      elder: t(lang, "stageElder"),
    };
    return map[pet.stage] ?? t(lang, "maxStage");
  };

  const getPathLabel = () => {
    if (!pet.evolutionPath) return "";
    const map: Record<string, string> = {
      energetic: `⚡ ${t(lang, "energeticPath")}`,
      foodie: `🍖 ${t(lang, "foodiePath")}`,
      neat: `✨ ${t(lang, "neatPath")}`,
      glowing: `🌟 ${t(lang, "glowingPath")}`,
    };
    return map[pet.evolutionPath] ?? pet.evolutionPath;
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t(lang, "profile")}</Text>

        <View style={styles.profileCard}>
          <LinearGradient
            colors={[Colors.bgCard, Colors.bgCardAlt]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <PetCreature species={pet.species} stage={pet.stage} mood={pet.mood} size={110} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{pet.name}</Text>
            <Text style={styles.profileSpecies}>
              {SPECIES_FULL_NAMES[pet.species]} · {t(lang, `stage${pet.stage.charAt(0).toUpperCase() + pet.stage.slice(1)}` as any)}
            </Text>
            <Text style={styles.profileBorn}>{t(lang, "born")} {bornStr}</Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <StatCard label={t(lang, "age")} value={`${pet.age}m`} color={Colors.primary} />
          <StatCard label={t(lang, "feedings")} value={pet.totalFeedings} color={Colors.accent} />
          <StatCard label={t(lang, "playSessions")} value={pet.totalPlaySessions} color={Colors.info} />
          <StatCard label={t(lang, "cleans")} value={pet.totalCleans} color="#60C0E0" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(lang, "evolution").toUpperCase()}</Text>
          <View style={styles.evoCard}>
            <View style={styles.evoRow}>
              <Text style={styles.evoLabel}>{t(lang, "nextStage")}</Text>
              <Text style={styles.evoValue}>{getStageNext()}</Text>
            </View>
            <View style={styles.evoRow}>
              <Text style={styles.evoLabel}>{t(lang, "timeAlive")}</Text>
              <Text style={styles.evoValue}>
                {Math.floor(pet.ageInSeconds / 3600)}h {Math.floor((pet.ageInSeconds % 3600) / 60)}m
              </Text>
            </View>
            {pet.evolutionPath && (
              <View style={styles.evoRow}>
                <Text style={styles.evoLabel}>{t(lang, "path")}</Text>
                <Text style={[styles.evoValue, { color: Colors.info }]}>
                  {getPathLabel()}
                </Text>
              </View>
            )}
            {!pet.evolutionPath && pet.stage === "baby" && (
              <View style={[styles.evoRow, { flexDirection: "column", gap: 8 }]}>
                <Text style={styles.evoLabel}>{t(lang, "possiblePaths")}</Text>
                <View style={styles.evoPaths}>
                  <View style={styles.evoPathHint}><Text style={styles.evoPathHintText}>⚡ {t(lang, "energeticHint")}</Text></View>
                  <View style={styles.evoPathHint}><Text style={styles.evoPathHintText}>🍖 {t(lang, "foodieHint")}</Text></View>
                  <View style={styles.evoPathHint}><Text style={styles.evoPathHintText}>✨ {t(lang, "neatHint")}</Text></View>
                  <View style={styles.evoPathHint}><Text style={styles.evoPathHintText}>🌟 {t(lang, "glowingHint")}</Text></View>
                </View>
              </View>
            )}
            {pet.rareVariant && (
              <View style={[styles.evoRow, { marginTop: 4 }]}>
                <Text style={styles.evoLabel}>{t(lang, "rare")}</Text>
                <Text style={[styles.evoValue, { color: Colors.accent }]}>
                  ✦ {pet.rareVariant.charAt(0).toUpperCase() + pet.rareVariant.slice(1)} {t(lang, "variant")}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(lang, "personality").toUpperCase()}</Text>
          <View style={styles.personalityCard}>
            <PersonalityBar label={t(lang, "playful" as any)} value={pet.personality.playful} color={Colors.primary} />
            <PersonalityBar label={t(lang, "lazy" as any)} value={pet.personality.lazy} color={Colors.textSecondary} />
            <PersonalityBar label={t(lang, "social" as any)} value={pet.personality.social} color={Colors.info} />
            <PersonalityBar label={t(lang, "foodie" as any)} value={pet.personality.foodie} color={Colors.accent} />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.releaseBtn, pressed && { opacity: 0.75 }]}
          onPress={() => { playClick(); handleReset(); }}
        >
          <Text style={styles.releaseBtnText}>{t(lang, "sayGoodbye")} {pet.name}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileSpecies: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  profileBorn: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  evoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  evoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  evoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  evoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  personalityCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evoPaths: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  evoPathHint: {
    backgroundColor: Colors.info + "15",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.info + "30",
  },
  evoPathHintText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.info,
  },
  releaseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger + "60",
    backgroundColor: Colors.danger + "15",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  releaseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
});
