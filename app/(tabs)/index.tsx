import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Colors, getTheme } from "@/constants/colors";
import { usePet } from "@/context/PetContext";
import { useGame, SHOP_ITEMS } from "@/context/GameContext";
import { scheduleStatNotification } from "@/utils/notifications";
import { playClick, playSound } from "@/utils/audio";
import { t } from "@/constants/i18n";
import PetCreature from "@/components/PetCreature";
import ActionButton from "@/components/ActionButton";
import MoodBadge from "@/components/MoodBadge";
import StatBar from "@/components/StatBar";
import PixelGrid from "@/components/PixelGrid";

const EGG_TAPS_TO_HATCH = 10;

const RARE_GLOW: Record<string, string> = {
  crystal: "#A8EEFF",
  shadow: "#8B5CF6",
  rainbow: "#FF6B9D",
  cosmic: "#4FC3F7",
  golden: "#FFD700",
};

function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function HomeScreen() {
  const {
    pet,
    isLoading,
    feedPet,
    playWithPet,
    cleanPet,
    healPet,
    toggleSleep,
    tapEgg,
  } = usePet();
  const {
    addGlowbits,
    checkAndClaimStreak,
    gameState,
    claimMysteryBox,
    getMysteryBoxCooldown,
  } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const theme = getTheme(gameState.settings.highContrastMode);
  const lang = gameState.settings.language;

  const eggShake = useSharedValue(0);
  const [rewardText, setRewardText] = useState("");
  const [rewardKey, setRewardKey] = useState(0);
  const rewardY = useSharedValue(0);
  const rewardOpacity = useSharedValue(0);
  const [streakModal, setStreakModal] = useState<{ day: number; glowbits: number; cosmetic?: string } | null>(null);
  const [boxCooldown, setBoxCooldown] = useState(0);
  const [boxRewardModal, setBoxRewardModal] = useState<number | null>(null);

  const rewardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rewardY.value }],
    opacity: rewardOpacity.value,
  }));

  const showReward = (text: string) => {
    if (gameState.settings.soundEnabled) playSound("reward");
    setRewardText(text);
    setRewardKey((k) => k + 1);
    rewardY.value = 0;
    rewardOpacity.value = 1;
    rewardY.value = withTiming(-52, { duration: 1100 });
    rewardOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 1020 })
    );
  };

  useEffect(() => {
    const reward = checkAndClaimStreak();
    if (reward) {
      setStreakModal(reward);
    }
  }, []);

  useEffect(() => {
    const cd = getMysteryBoxCooldown();
    setBoxCooldown(cd);
    if (cd > 0) {
      const interval = setInterval(() => {
        const remaining = getMysteryBoxCooldown();
        setBoxCooldown(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!pet || pet.stage === "egg") return;
    const notifEnabled = gameState.settings.notificationsEnabled;
    if (pet.stats.hunger < 25) {
      scheduleStatNotification(pet.name, "hungry", notifEnabled, 1800);
    }
    if (pet.stats.happiness < 25) {
      scheduleStatNotification(pet.name, "bored", notifEnabled, 1800);
    }
    if (pet.stats.cleanliness < 25) {
      scheduleStatNotification(pet.name, "dirty", notifEnabled, 1800);
    }
  }, [pet?.stats.hunger, pet?.stats.happiness, pet?.stats.cleanliness]);

  useEffect(() => {
    if (!isLoading && !pet) {
      router.replace("/create");
    }
  }, [pet, isLoading]);

  if (isLoading || !pet) return null;

  const isEgg = pet.stage === "egg";
  const isSleeping = pet.isSleeping;
  const rareGlowColor = pet.rareVariant ? RARE_GLOW[pet.rareVariant] : null;

  const handleEggTap = () => {
    const result = tapEgg();
    if (result === "hatched") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      eggShake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 55 }),
        withTiming(6, { duration: 55 }),
        withTiming(0, { duration: 50 })
      );
    }
  };

  const handleFeed = () => {
    if (gameState.settings.soundEnabled) playSound("feed");
    feedPet();
    addGlowbits(2);
    showReward("+2 🪙");
  };

  const handlePlay = () => {
    if (gameState.settings.soundEnabled) playSound("play");
    playWithPet();
    addGlowbits(3);
    showReward("+3 🪙");
  };

  const handleClean = () => {
    if (gameState.settings.soundEnabled) playSound("clean");
    cleanPet();
    addGlowbits(2);
    showReward("+2 🪙");
  };

  const handleOpenBox = () => {
    playClick();
    const reward = claimMysteryBox();
    if (reward !== null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBoxRewardModal(reward);
      setBoxCooldown(getMysteryBoxCooldown());
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setBoxCooldown(getMysteryBoxCooldown());
    }
  };

  const equippedEmojis: Record<string, string> = {};
  for (const [cat, itemId] of Object.entries(gameState.equipped)) {
    const found = SHOP_ITEMS.find((i) => i.id === itemId);
    if (found) equippedEmojis[cat] = found.emoji;
  }

  const getStageLabel = () => {
    const map: Record<string, string> = {
      egg: t(lang, "stageEgg"),
      baby: t(lang, "stageBaby"),
      child: t(lang, "stageChild"),
      teen: t(lang, "stageTeen"),
      adult: t(lang, "stageAdult"),
      elder: t(lang, "stageElder"),
    };
    return map[pet.stage] ?? pet.stage.toUpperCase();
  };

  const getEvoEmoji = () => {
    if (!pet.evolutionPath) return "";
    const map: Record<string, string> = {
      energetic: "⚡",
      foodie: "🍖",
      neat: "✨",
      glowing: "🌟",
    };
    return map[pet.evolutionPath] ?? "";
  };

  const getEvoLabel = () => {
    if (!pet.evolutionPath) return "";
    const map: Record<string, string> = {
      energetic: t(lang, "energeticPath"),
      foodie: t(lang, "foodiePath"),
      neat: t(lang, "neatPath"),
      glowing: t(lang, "glowingPath"),
    };
    return map[pet.evolutionPath] ?? pet.evolutionPath;
  };

  const getEggHint = () => {
    const taps = pet.eggTaps ?? 0;
    if (taps === 0) return t(lang, "tapEgg");
    if (taps >= EGG_TAPS_TO_HATCH - 2) return t(lang, "almostThere");
    return t(lang, "keepTapping");
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />
      <PixelGrid />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.petName}>{pet.name}</Text>
            <View style={styles.headerMeta}>
              <View style={styles.stageBadge}>
                <Text style={styles.stageText}>{getStageLabel()}</Text>
              </View>
              {!isEgg && <Text style={styles.ageText}>{t(lang, "age")} {pet.age}m</Text>}
              {pet.rareVariant && (
                <View style={[styles.rareBadge, { borderColor: rareGlowColor + "80" }]}>
                  <Text style={[styles.rareBadgeText, { color: rareGlowColor ?? Colors.accent }]}>
                    ✦ {pet.rareVariant.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            {!isEgg && <MoodBadge mood={pet.mood} lang={lang} />}
            <View style={styles.glowbitsWrapper}>
              <View style={styles.glowbitsBadge}>
                <Text style={styles.glowbitsCoin}>🪙</Text>
                <Text style={styles.glowbitsNum}>{gameState.glowbits.toLocaleString()}</Text>
              </View>
              <Animated.View style={[styles.floatingReward, rewardAnimStyle]} pointerEvents="none">
                <Text style={styles.floatingRewardText}>{rewardText}</Text>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Evolution path badge */}
        {pet.evolutionPath && !isEgg && (
          <View style={styles.evoPathBadge}>
            <Text style={styles.evoPathText}>
              {getEvoEmoji()} {getEvoLabel()} {t(lang, "evolutionWord")}
            </Text>
          </View>
        )}

        {/* Mystery Box card */}
        <Pressable
          style={[styles.mysteryBox, boxCooldown > 0 && styles.mysteryBoxCooling]}
          onPress={handleOpenBox}
        >
          <Text style={styles.mysteryBoxEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mysteryBoxTitle}>{t(lang, "mysteryBox")}</Text>
            {boxCooldown > 0 ? (
              <Text style={styles.mysteryBoxCooldown}>
                {t(lang, "boxCooldown")} {formatCooldown(boxCooldown)}
              </Text>
            ) : (
              <Text style={styles.mysteryBoxReady}>{t(lang, "boxReady")}</Text>
            )}
          </View>
          {boxCooldown <= 0 && (
            <View style={styles.openBoxBtn}>
              <Text style={styles.openBoxBtnText}>{t(lang, "openBox")}</Text>
            </View>
          )}
        </Pressable>

        {/* Creature */}
        <View style={styles.petStage}>
          <LinearGradient
            colors={[Colors.bgCard, Colors.bgCardAlt]}
            style={styles.petCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.glowRing, rareGlowColor && { borderColor: rareGlowColor + "40", backgroundColor: rareGlowColor + "08" }]} />

            {isEgg ? (
              <Pressable onPress={handleEggTap} style={styles.eggPressable} hitSlop={24}>
                <Animated.View style={{ transform: [{ translateX: eggShake }] }}>
                  <PetCreature
                    species={pet.species}
                    stage={pet.stage}
                    mood={pet.mood}
                    size={185}
                    eggTaps={pet.eggTaps ?? 0}
                    eggTapsToHatch={EGG_TAPS_TO_HATCH}
                  />
                </Animated.View>
                <Text style={styles.eggHint}>{getEggHint()}</Text>
              </Pressable>
            ) : (
              <View style={{ alignItems: "center" }}>
                <PetCreature
                  species={pet.species}
                  stage={pet.stage}
                  mood={pet.mood}
                  size={185}
                  equippedItems={equippedEmojis}
                />
              </View>
            )}

            {isSleeping && !isEgg && (
              <Text style={styles.sleepHint}>{t(lang, "sleeping")}</Text>
            )}
          </LinearGradient>
        </View>

        {/* Stats */}
        {!isEgg && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>{t(lang, "status").toUpperCase()}</Text>
            <StatBar label={t(lang, "hunger")} value={pet.stats.hunger} color={Colors.accent} icon=">" />
            <StatBar label={t(lang, "happiness")} value={pet.stats.happiness} color={Colors.primary} icon="*" />
            <StatBar label={t(lang, "energy")} value={pet.stats.energy} color={Colors.info} icon="+" />
            <StatBar label={t(lang, "health")} value={pet.stats.health} color="#E060A0" icon="!" />
            <StatBar label={t(lang, "cleanliness")} value={pet.stats.cleanliness} color="#60C0E0" icon="~" />
          </View>
        )}

        {/* Actions */}
        {!isEgg && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>{t(lang, "actions").toUpperCase()}</Text>
            <View style={styles.actionsRow}>
              <ActionButton
                icon="🍖"
                label={t(lang, "feed")}
                onPress={handleFeed}
                disabled={isSleeping || pet.stats.hunger > 95}
                color={Colors.accent}
                flex
              />
              <ActionButton
                icon="🚿"
                label={t(lang, "clean")}
                onPress={handleClean}
                disabled={isSleeping || pet.stats.cleanliness > 95}
                color="#60C0E0"
                flex
              />
            </View>
            <View style={[styles.actionsRow, styles.actionsRowTwo]}>
              <ActionButton
                icon="💊"
                label={t(lang, "heal")}
                onPress={healPet}
                disabled={isSleeping || pet.stats.health > 90}
                color="#E060A0"
                flex
              />
              <ActionButton
                icon="🌙"
                label={isSleeping ? t(lang, "wakeUp") : t(lang, "sleep")}
                onPress={toggleSleep}
                color={Colors.info}
                flex
              />
            </View>
          </View>
        )}

        {/* Sick notice */}
        {!isEgg && pet.stats.health <= 20 && (
          <View style={styles.sickNotice}>
            <Text style={styles.sickIcon}>!</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sickTitle}>{pet.name} {t(lang, "petSick")}</Text>
              <Text style={styles.sickText}>{t(lang, "petSickHint")}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Daily Streak Modal */}
      <Modal visible={!!streakModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🔥</Text>
            <Text style={styles.modalTitle}>{t(lang, "day")} {streakModal?.day} {t(lang, "streak")}!</Text>
            <Text style={styles.modalSubtitle}>{t(lang, "welcomeBack")}</Text>
            <View style={styles.modalReward}>
              <Text style={styles.modalRewardText}>+{streakModal?.glowbits} 🪙 {t(lang, "glowbitsEarned")}</Text>
              {streakModal?.cosmetic && (
                <Text style={styles.modalBonusText}>👑 {t(lang, "crownUnlocked")}</Text>
              )}
            </View>
            <Pressable
              style={styles.modalBtn}
              onPress={() => { playClick(); setStreakModal(null); }}
            >
              <Text style={styles.modalBtnText}>{t(lang, "awesome")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Mystery Box reward modal */}
      <Modal visible={boxRewardModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🎁</Text>
            <Text style={styles.modalTitle}>{t(lang, "boxReward")}</Text>
            <View style={styles.modalReward}>
              <Text style={styles.modalRewardText}>+{boxRewardModal} 🪙 {t(lang, "glowbitsEarned")}</Text>
            </View>
            <Pressable
              style={styles.modalBtn}
              onPress={() => { playClick(); setBoxRewardModal(null); }}
            >
              <Text style={styles.modalBtnText}>{t(lang, "awesome")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  petName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.primary + "25",
    borderWidth: 1,
    borderColor: Colors.primary + "50",
  },
  stageText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  ageText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  rareBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: Colors.bgCard,
  },
  rareBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  glowbitsWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  glowbitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.accent + "55",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  glowbitsCoin: { fontSize: 13 },
  glowbitsNum: {
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
    zIndex: 100,
  },
  floatingRewardText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  evoPathBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.info + "15",
    borderWidth: 1,
    borderColor: Colors.info + "40",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  evoPathText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.info,
    letterSpacing: 0.3,
  },
  mysteryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
  },
  mysteryBoxCooling: {
    borderColor: Colors.border,
    opacity: 0.8,
  },
  mysteryBoxEmoji: { fontSize: 28 },
  mysteryBoxTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  mysteryBoxReady: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    marginTop: 2,
  },
  mysteryBoxCooldown: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  openBoxBtn: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "60",
  },
  openBoxBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  petStage: { marginBottom: 16 },
  petCard: {
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    minHeight: 240,
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary + "08",
    borderWidth: 1,
    borderColor: Colors.primary + "18",
  },
  eggPressable: {
    alignItems: "center",
    gap: 4,
  },
  eggHint: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 0.3,
    marginTop: 6,
  },
  sleepHint: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.info,
  },
  statsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 14,
  },
  actionsSection: { marginBottom: 8 },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionsRowTwo: {
    marginTop: 10,
  },
  sickNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.danger + "18",
    borderWidth: 1,
    borderColor: Colors.danger + "50",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  sickIcon: {
    fontSize: 20,
    color: Colors.danger,
    fontFamily: "Inter_700Bold",
    width: 32,
    textAlign: "center",
  },
  sickTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
    marginBottom: 2,
  },
  sickText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalEmoji: { fontSize: 52, marginBottom: 8 },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 20,
  },
  modalReward: {
    backgroundColor: Colors.accent + "18",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    marginBottom: 20,
    gap: 6,
  },
  modalRewardText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  modalBonusText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 13,
    width: "100%",
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});
