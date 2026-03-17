import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Colors, getTheme } from "@/constants/colors";
import { useGame, SHOP_ITEMS } from "@/context/GameContext";
import { usePet } from "@/context/PetContext";
import { t } from "@/constants/i18n";
import { playClick } from "@/utils/audio";
import PetCreature from "@/components/PetCreature";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GAME_AREA_H = Math.min(SCREEN_H * 0.52, 360);
const SNACK_GAME_DURATION = 30;
const TICK_MS = 80;
const PET_WIDTH_PCT = 12;
const CATCH_RADIUS_PCT = 9;

const INITIAL_SPAWN_INTERVAL = 1800;
const INITIAL_FALL_SPEED = 2;
const SPEED_INCREASE_INTERVAL = 8000;
const SPEED_INCREASE_FACTOR = 1.15;
const MAX_FALL_SPEED = 12;
const MIN_SPAWN_INTERVAL = 400;

const SNACK_EMOJIS = ["🍎", "🍕", "🍔", "🍩", "🍣", "🌮", "🧁", "🍓", "🥐", "🍦"];

const MEMORY_PAIRS = ["🌟", "⭐", "🎮", "🕹️", "🍕", "🍔", "🌈", "🌊", "💎", "💍", "🚀", "🛸"];
const MEMORY_DURATION = 60;
const GLOWBITS_PER_PAIR = 5;

type GameChoice = "select" | "snack" | "memory";
type GameStatus = "idle" | "playing" | "over";

interface Snack {
  id: string;
  x: number;
  y: number;
  emoji: string;
}

interface MemoryCard {
  id: number;
  emoji: string;
  pairIndex: number;
  flipped: boolean;
  matched: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ArcadeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { claimArcadeReward, arcadeGamesLeft, gameState } = useGame();
  const { pet } = usePet();
  const lang = gameState.settings.language;
  const theme = getTheme(gameState.settings.highContrastMode);

  const [gameChoice, setGameChoice] = useState<GameChoice>("select");
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SNACK_GAME_DURATION);
  const [lastReward, setLastReward] = useState<number>(0);
  const [bestSnackScore, setBestSnackScore] = useState(0);
  const [bestMemoryScore, setBestMemoryScore] = useState(0);

  const [petX, setPetX] = useState(50);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [speedUpFlash, setSpeedUpFlash] = useState(false);

  const petXRef = useRef(50);
  const scoreRef = useRef(0);
  const snacksRef = useRef<Snack[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallSpeedRef = useRef(INITIAL_FALL_SPEED);
  const spawnIntervalRef = useRef(INITIAL_SPAWN_INTERVAL);

  const speedUpOpacity = useSharedValue(0);
  const speedUpStyle = useAnimatedStyle(() => ({
    opacity: speedUpOpacity.value,
  }));

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const flipLockRef = useRef(false);
  const memoryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    if (speedRef.current) clearInterval(speedRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
  }, []);

  const endGame = useCallback(
    (finalScore: number) => {
      clearAll();
      setStatus("over");
      const reward = claimArcadeReward(finalScore);
      setLastReward(reward);
      if (gameChoice === "snack") {
        setBestSnackScore((prev) => Math.max(prev, finalScore));
      } else {
        setBestMemoryScore((prev) => Math.max(prev, finalScore));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [clearAll, claimArcadeReward, gameChoice]
  );

  const spawnSnack = useCallback(() => {
    const newSnack: Snack = {
      id: Math.random().toString(36).slice(2),
      x: 8 + Math.random() * 84,
      y: 0,
      emoji: SNACK_EMOJIS[Math.floor(Math.random() * SNACK_EMOJIS.length)],
    };
    snacksRef.current = [...snacksRef.current, newSnack];
    setSnacks([...snacksRef.current]);
  }, []);

  const restartSpawnInterval = useCallback(() => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(spawnSnack, spawnIntervalRef.current);
  }, [spawnSnack]);

  const startSnackGame = useCallback(() => {
    clearAll();
    petXRef.current = 50;
    scoreRef.current = 0;
    snacksRef.current = [];
    fallSpeedRef.current = INITIAL_FALL_SPEED;
    spawnIntervalRef.current = INITIAL_SPAWN_INTERVAL;
    setPetX(50);
    setScore(0);
    setTimeLeft(SNACK_GAME_DURATION);
    setSnacks([]);
    setLastReward(0);
    setSpeedUpFlash(false);
    setStatus("playing");

    tickRef.current = setInterval(() => {
      snacksRef.current = snacksRef.current
        .map((s) => ({ ...s, y: s.y + fallSpeedRef.current }))
        .filter((s) => {
          if (s.y >= 95) return false;
          const dx = Math.abs(s.x - petXRef.current);
          if (s.y >= 82 && dx < CATCH_RADIUS_PCT) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return false;
          }
          return true;
        });
      setSnacks([...snacksRef.current]);
    }, TICK_MS);

    let remaining = SNACK_GAME_DURATION;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        endGame(scoreRef.current);
      }
    }, 1000);

    spawnRef.current = setInterval(spawnSnack, INITIAL_SPAWN_INTERVAL);
    spawnSnack();

    speedRef.current = setInterval(() => {
      const newSpeed = Math.min(fallSpeedRef.current * SPEED_INCREASE_FACTOR, MAX_FALL_SPEED);
      const newInterval = Math.max(spawnIntervalRef.current / SPEED_INCREASE_FACTOR, MIN_SPAWN_INTERVAL);
      fallSpeedRef.current = newSpeed;
      spawnIntervalRef.current = newInterval;

      if (spawnRef.current) clearInterval(spawnRef.current);
      spawnRef.current = setInterval(spawnSnack, spawnIntervalRef.current);

      setSpeedUpFlash(true);
      speedUpOpacity.value = 1;
      speedUpOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 900 })
      );
      setTimeout(() => setSpeedUpFlash(false), 1100);
    }, SPEED_INCREASE_INTERVAL);
  }, [clearAll, spawnSnack, endGame, speedUpOpacity]);

  const startMemoryGame = useCallback(() => {
    clearAll();
    const deck: MemoryCard[] = [];
    for (let i = 0; i < MEMORY_PAIRS.length; i += 2) {
      deck.push({ id: i, emoji: MEMORY_PAIRS[i], pairIndex: Math.floor(i / 2), flipped: false, matched: false });
      deck.push({ id: i + 1, emoji: MEMORY_PAIRS[i + 1], pairIndex: Math.floor(i / 2), flipped: false, matched: false });
    }
    setCards(shuffleArray(deck));
    setFlippedIds([]);
    setMatchedPairs(0);
    scoreRef.current = 0;
    flipLockRef.current = false;
    setScore(0);
    setTimeLeft(MEMORY_DURATION);
    setLastReward(0);
    setStatus("playing");

    let remaining = MEMORY_DURATION;
    memoryTimerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearAll();
        setStatus("over");
        const reward = claimArcadeReward(scoreRef.current * GLOWBITS_PER_PAIR);
        setLastReward(reward);
        setBestMemoryScore((prev) => Math.max(prev, scoreRef.current));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, [clearAll, claimArcadeReward]);

  const handleCardTap = useCallback((cardId: number) => {
    if (flipLockRef.current) return;
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (!card || card.flipped || card.matched) return prev;

      const newCards = prev.map((c) => c.id === cardId ? { ...c, flipped: true } : c);
      const currentlyFlipped = newCards.filter((c) => c.flipped && !c.matched);

      if (currentlyFlipped.length === 2) {
        flipLockRef.current = true;
        const [a, b] = currentlyFlipped;

        if (a.pairIndex === b.pairIndex) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          scoreRef.current += 1;
          const newMatched = scoreRef.current;
          setScore(newMatched);
          setMatchedPairs(newMatched);

          const matched = newCards.map((c) =>
            c.pairIndex === a.pairIndex ? { ...c, matched: true, flipped: true } : c
          );
          flipLockRef.current = false;

          if (newMatched >= 6) {
            if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
            setTimeout(() => {
              setStatus("over");
              const reward = claimArcadeReward(newMatched * GLOWBITS_PER_PAIR);
              setLastReward(reward);
              setBestMemoryScore((prev) => Math.max(prev, newMatched));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 400);
          }
          return matched;
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => {
            setCards((p) => p.map((c) => (c.id === a.id || c.id === b.id) ? { ...c, flipped: false } : c));
            flipLockRef.current = false;
          }, 1000);
          return newCards;
        }
      }
      return newCards;
    });
  }, [claimArcadeReward]);

  useEffect(() => () => clearAll(), [clearAll]);

  const startMove = (dir: "left" | "right") => {
    moveIntervalRef.current = setInterval(() => {
      const delta = dir === "left" ? -3 : 3;
      petXRef.current = Math.max(6, Math.min(94, petXRef.current + delta));
      setPetX(petXRef.current);
    }, 60);
  };

  const stopMove = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  const handleBackToSelect = () => {
    clearAll();
    setStatus("idle");
    setGameChoice("select");
  };

  const rewardCapped = arcadeGamesLeft <= 0;
  const isSnack = gameChoice === "snack";
  const isMemory = gameChoice === "memory";
  const bestScore = isSnack ? bestSnackScore : bestMemoryScore;

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t(lang, "arcade")}</Text>
          <Text style={styles.subtitle}>
            {gameChoice === "select"
              ? t(lang, "chooseGame")
              : isSnack
              ? t(lang, "snackCatch")
              : t(lang, "memoryMatch")}
          </Text>
        </View>
        {bestScore > 0 && gameChoice !== "select" && (
          <View style={styles.bestBox}>
            <Text style={styles.bestLabel}>{t(lang, "best")}</Text>
            <Text style={styles.bestNum}>{bestScore}</Text>
          </View>
        )}
      </View>

      {gameChoice === "select" && (
        <View style={styles.selectContainer}>
          <Pressable
            style={styles.gameCard}
            onPress={() => { playClick(); setGameChoice("snack"); }}
          >
            <Text style={styles.gameCardEmoji}>🍕</Text>
            <Text style={styles.gameCardTitle}>{t(lang, "snackCatch")}</Text>
            <Text style={styles.gameCardDesc}>{t(lang, "arcadeDesc")}</Text>
          </Pressable>
          <Pressable
            style={styles.gameCard}
            onPress={() => { playClick(); setGameChoice("memory"); }}
          >
            <Text style={styles.gameCardEmoji}>🃏</Text>
            <Text style={styles.gameCardTitle}>{t(lang, "memoryMatch")}</Text>
            <Text style={styles.gameCardDesc}>{t(lang, "memoryMatchDesc")}</Text>
          </Pressable>
          {rewardCapped && (
            <View style={styles.cappedBanner}>
              <Text style={styles.cappedText}>{t(lang, "rewardCapped")}</Text>
            </View>
          )}
        </View>
      )}

      {isSnack && (
        <>
          <View style={styles.gameArea}>
            <LinearGradient colors={[Colors.bgCard, Colors.bgCardAlt]} style={styles.gameCanvas}>
              {status === "idle" && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayEmoji}>🍕</Text>
                  <Text style={styles.overlayTitle}>{t(lang, "snackCatch")}</Text>
                  <Text style={styles.overlayDesc}>{t(lang, "arcadeDesc")}</Text>
                  {rewardCapped && (
                    <View style={styles.cappedBanner}>
                      <Text style={styles.cappedText}>{t(lang, "rewardCapped")}</Text>
                    </View>
                  )}
                  <Pressable style={styles.startBtn} onPress={() => { playClick(); startSnackGame(); }}>
                    <Text style={styles.startBtnText}>{t(lang, "startGame")}</Text>
                  </Pressable>
                  <Pressable onPress={handleBackToSelect}>
                    <Text style={styles.backText}>← {t(lang, "chooseGame")}</Text>
                  </Pressable>
                </View>
              )}

              {status === "over" && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayEmoji}>🏆</Text>
                  <Text style={styles.overlayTitle}>{t(lang, "gameOver")}</Text>
                  <Text style={styles.scoreDisplay}>{score} {t(lang, "snacksCaught")}</Text>
                  {lastReward > 0 ? (
                    <Text style={styles.rewardText}>+{lastReward} 🪙 {t(lang, "earned")}</Text>
                  ) : rewardCapped ? (
                    <Text style={styles.cappedText}>{t(lang, "rewardCapped")}</Text>
                  ) : null}
                  <Pressable style={styles.startBtn} onPress={() => { playClick(); startSnackGame(); }}>
                    <Text style={styles.startBtnText}>{t(lang, "playAgain")}</Text>
                  </Pressable>
                  <Pressable onPress={handleBackToSelect}>
                    <Text style={styles.backText}>← {t(lang, "chooseGame")}</Text>
                  </Pressable>
                </View>
              )}

              {status === "playing" && (
                <>
                  <View style={styles.hud}>
                    <View style={styles.hudItem}>
                      <Text style={styles.hudLabel}>{t(lang, "score")}</Text>
                      <Text style={styles.hudValue}>{score}</Text>
                    </View>
                    {speedUpFlash && (
                      <Animated.View style={[styles.speedUpBadge, speedUpStyle]}>
                        <Text style={styles.speedUpText}>{t(lang, "speedUp")}</Text>
                      </Animated.View>
                    )}
                    <View style={[styles.hudItem, styles.timerBox, timeLeft <= 10 && styles.timerBoxUrgent]}>
                      <Text style={[styles.hudValue, timeLeft <= 10 && { color: Colors.danger }]}>
                        {timeLeft}s
                      </Text>
                    </View>
                  </View>

                  {snacks.map((snack) => (
                    <Text
                      key={snack.id}
                      style={[
                        styles.snack,
                        { left: `${snack.x}%` as any, top: `${snack.y}%` as any },
                      ]}
                    >
                      {snack.emoji}
                    </Text>
                  ))}

                  <View style={[styles.petCatcher, { left: `${petX}%` as any }]}>
                    {pet ? (
                      <PetCreature
                        species={pet.species}
                        stage={pet.stage}
                        mood={pet.mood}
                        size={50}
                        equippedItems={Object.fromEntries(
                          Object.entries(gameState.equipped).map(([cat, itemId]) => {
                            const found = SHOP_ITEMS.find((i) => i.id === itemId);
                            return [cat, found ? found.emoji : ""];
                          }).filter(([, v]) => v)
                        )}
                      />
                    ) : (
                      <Text style={{ fontSize: 32 }}>🟢</Text>
                    )}
                  </View>
                </>
              )}
            </LinearGradient>
          </View>

          {status === "playing" && (
            <View style={styles.controls}>
              <Pressable
                style={styles.controlBtn}
                onPressIn={() => startMove("left")}
                onPressOut={stopMove}
              >
                <Text style={styles.controlBtnText}>◀ {t(lang, "left")}</Text>
              </Pressable>
              <View style={styles.controlCenter}>
                <Text style={styles.controlHint}>{t(lang, "holdToMove")}</Text>
              </View>
              <Pressable
                style={styles.controlBtn}
                onPressIn={() => startMove("right")}
                onPressOut={stopMove}
              >
                <Text style={styles.controlBtnText}>{t(lang, "right")} ▶</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {isMemory && (
        <>
          <View style={styles.gameArea}>
            <LinearGradient colors={[Colors.bgCard, Colors.bgCardAlt]} style={styles.gameCanvas}>
              {status === "idle" && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayEmoji}>🃏</Text>
                  <Text style={styles.overlayTitle}>{t(lang, "memoryMatch")}</Text>
                  <Text style={styles.overlayDesc}>{t(lang, "memoryMatchDesc")}</Text>
                  {rewardCapped && (
                    <View style={styles.cappedBanner}>
                      <Text style={styles.cappedText}>{t(lang, "rewardCapped")}</Text>
                    </View>
                  )}
                  <Pressable style={styles.startBtn} onPress={() => { playClick(); startMemoryGame(); }}>
                    <Text style={styles.startBtnText}>{t(lang, "startGame")}</Text>
                  </Pressable>
                  <Pressable onPress={handleBackToSelect}>
                    <Text style={styles.backText}>← {t(lang, "chooseGame")}</Text>
                  </Pressable>
                </View>
              )}

              {status === "over" && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayEmoji}>{matchedPairs >= 6 ? "🎉" : "⏰"}</Text>
                  <Text style={styles.overlayTitle}>
                    {matchedPairs >= 6 ? t(lang, "allMatched") : t(lang, "timeUp")}
                  </Text>
                  <Text style={styles.scoreDisplay}>{matchedPairs} {t(lang, "pairsMatched")}</Text>
                  {lastReward > 0 ? (
                    <Text style={styles.rewardText}>+{lastReward} 🪙 {t(lang, "earned")}</Text>
                  ) : rewardCapped ? (
                    <Text style={styles.cappedText}>{t(lang, "rewardCapped")}</Text>
                  ) : null}
                  <Pressable style={styles.startBtn} onPress={() => { playClick(); startMemoryGame(); }}>
                    <Text style={styles.startBtnText}>{t(lang, "playAgain")}</Text>
                  </Pressable>
                  <Pressable onPress={handleBackToSelect}>
                    <Text style={styles.backText}>← {t(lang, "chooseGame")}</Text>
                  </Pressable>
                </View>
              )}

              {status === "playing" && (
                <>
                  <View style={styles.hud}>
                    <View style={styles.hudItem}>
                      <Text style={styles.hudLabel}>{t(lang, "score")}</Text>
                      <Text style={styles.hudValue}>{matchedPairs}/6</Text>
                    </View>
                    <View style={[styles.hudItem, styles.timerBox, timeLeft <= 10 && styles.timerBoxUrgent]}>
                      <Text style={[styles.hudValue, timeLeft <= 10 && { color: Colors.danger }]}>
                        {timeLeft}s
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memoryGrid}>
                    {cards.map((card) => (
                      <Pressable
                        key={card.id}
                        style={[
                          styles.memoryCard,
                          card.flipped && styles.memoryCardFlipped,
                          card.matched && styles.memoryCardMatched,
                        ]}
                        onPress={() => handleCardTap(card.id)}
                        disabled={card.flipped || card.matched}
                      >
                        <Text style={styles.memoryCardText}>
                          {card.flipped || card.matched ? card.emoji : "?"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </LinearGradient>
          </View>
        </>
      )}

      {status !== "playing" && (
        <View style={[styles.infoBox, { marginBottom: bottomPad + 90 }]}>
          <Text style={styles.infoText}>🪙 {t(lang, "rewardsInfo")}</Text>
          {arcadeGamesLeft < 3 && (
            <Text style={styles.gamesLeft}>
              {arcadeGamesLeft} {t(lang, "gamesLeft")}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  bestBox: {
    backgroundColor: Colors.accent + "20",
    borderWidth: 1,
    borderColor: Colors.accent + "50",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  bestLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  bestNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  selectContainer: {
    paddingHorizontal: 16,
    gap: 14,
  },
  gameCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 6,
  },
  gameCardEmoji: { fontSize: 36 },
  gameCardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  gameCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  gameArea: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    height: GAME_AREA_H,
  },
  gameCanvas: { flex: 1, position: "relative" },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  overlayEmoji: { fontSize: 44 },
  overlayTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  overlayDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  cappedBanner: {
    backgroundColor: Colors.accent + "18",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
  },
  cappedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
    textAlign: "center",
  },
  scoreDisplay: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  rewardText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  startBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  backText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginTop: 6,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  hudItem: { alignItems: "center" },
  hudLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  hudValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  timerBox: {
    backgroundColor: Colors.bgCard + "CC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerBoxUrgent: { backgroundColor: Colors.danger + "30" },
  speedUpBadge: {
    backgroundColor: Colors.primary + "30",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + "60",
  },
  speedUpText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  snack: {
    position: "absolute",
    fontSize: 24,
    marginLeft: -12,
    marginTop: -12,
  },
  petCatcher: {
    position: "absolute",
    bottom: "8%",
    marginLeft: -18,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  controlCenter: { alignItems: "center" },
  controlHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 44,
    gap: 8,
    flex: 1,
  },
  memoryCard: {
    width: "21%",
    aspectRatio: 0.85,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCardFlipped: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.primary + "60",
  },
  memoryCardMatched: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary,
  },
  memoryCardText: {
    fontSize: 26,
    color: Colors.textMuted,
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  gamesLeft: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
