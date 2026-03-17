import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { t } from "@/constants/i18n";
import { useGame } from "@/context/GameContext";

export type PetStage = "egg" | "baby" | "child" | "teen" | "adult" | "elder";
export type PetMood = "ecstatic" | "happy" | "neutral" | "sad" | "sick" | "sleeping";
export type PetSpecies = "glorp" | "zippix" | "nubble";
export type EvolutionPath = "energetic" | "foodie" | "neat" | "glowing" | null;
export type RareVariant = "crystal" | "shadow" | "rainbow" | "cosmic" | "golden" | null;

const ALL_SPECIES: PetSpecies[] = ["glorp", "zippix", "nubble"];

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
  cleanliness: number;
}

export interface PetPersonality {
  playful: number;
  lazy: number;
  social: number;
  foodie: number;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  event: string | { name: string; eventKey: string; stage?: string; path?: string; variant?: string };
  icon: string;
}

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  stage: PetStage;
  stats: PetStats;
  personality: PetPersonality;
  age: number;
  ageInSeconds: number;
  born: number;
  mood: PetMood;
  isSleeping: boolean;
  lastInteraction: number;
  journal: JournalEntry[];
  totalFeedings: number;
  totalPlaySessions: number;
  totalCleans: number;
  eggTaps: number;
  evolutionPath: EvolutionPath;
  rareVariant: RareVariant;
  equippedHat?: string;
  equippedGlasses?: string;
  equippedCostume?: string;
}

interface PetContextValue {
  pet: Pet | null;
  isLoading: boolean;
  createPet: (name: string) => void;
  feedPet: () => void;
  playWithPet: () => void;
  cleanPet: () => void;
  healPet: () => void;
  toggleSleep: () => void;
  tapEgg: () => "tapped" | "hatched";
  resetPet: () => void;
  applyStatBoost: (stat: string, amount: number) => void;
}

const PetContext = createContext<PetContextValue | null>(null);

const STORAGE_KEY = "@pixelpal_pet_v3";
const EGG_TAPS_TO_HATCH = 10;

// Age thresholds in seconds
const STAGE_AGE_THRESHOLDS = {
  egg: 0,
  baby: 60,
  child: 300,
  teen: 900,
  adult: 2700,
  elder: 7200,
};

const DECAY_RATE_PER_SECOND = {
  hunger: 0.015,
  happiness: 0.01,
  energy: 0.008,
  cleanliness: 0.005,
};

// Health never goes to 0 — minimum is 5 (pet gets sick but never "dies")
const HEALTH_MIN = 5;

function getMood(stats: PetStats, isSleeping: boolean): PetMood {
  if (isSleeping) return "sleeping";
  if (stats.health <= 20) return "sick";
  const avg =
    (stats.hunger + stats.happiness + stats.energy + stats.health + stats.cleanliness) / 5;
  if (avg >= 85) return "ecstatic";
  if (avg >= 65) return "happy";
  if (avg >= 40) return "neutral";
  return "sad";
}

function getStage(ageInSeconds: number): PetStage {
  if (ageInSeconds < STAGE_AGE_THRESHOLDS.baby) return "egg";
  if (ageInSeconds < STAGE_AGE_THRESHOLDS.child) return "baby";
  if (ageInSeconds < STAGE_AGE_THRESHOLDS.teen) return "child";
  if (ageInSeconds < STAGE_AGE_THRESHOLDS.adult) return "teen";
  if (ageInSeconds < STAGE_AGE_THRESHOLDS.elder) return "adult";
  return "elder";
}

function addJournalEntry(
  journal: JournalEntry[],
  event: JournalEntry["event"],
  icon: string
): JournalEntry[] {
  const entry: JournalEntry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    timestamp: Date.now(),
    event,
    icon,
  };
  return [entry, ...journal].slice(0, 50);
}

function randomSpecies(): PetSpecies {
  return ALL_SPECIES[Math.floor(Math.random() * ALL_SPECIES.length)];
}

const RARE_VARIANTS: RareVariant[] = ["crystal", "shadow", "rainbow", "cosmic", "golden"];

function computeEvolutionPath(
  totalPlaySessions: number,
  totalFeedings: number,
  totalCleans: number,
  avgHappiness: number
): EvolutionPath {
  if (avgHappiness > 85) return "glowing";
  const max = Math.max(totalPlaySessions, totalFeedings, totalCleans);
  if (max === 0) return null;
  if (totalPlaySessions === max) return "energetic";
  if (totalFeedings === max) return "foodie";
  return "neat";
}

function rollRareVariant(): RareVariant {
  if (Math.random() < 0.02) {
    return RARE_VARIANTS[Math.floor(Math.random() * RARE_VARIANTS.length)];
  }
  return null;
}

function createDefaultPet(name: string): Pet {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name,
    species: randomSpecies(),
    stage: "egg",
    stats: { hunger: 80, happiness: 80, energy: 90, health: 100, cleanliness: 90 },
    personality: { playful: 50, lazy: 50, social: 50, foodie: 50 },
    age: 0,
    ageInSeconds: 0,
    born: Date.now(),
    mood: "happy",
    isSleeping: false,
    lastInteraction: Date.now(),
    journal: [
      {
        id: "born",
        timestamp: Date.now(),
        event: { name: `${name}'s`, eventKey: "eventEggAppeared" },
        icon: "egg",
      },
    ],
    totalFeedings: 0,
    totalPlaySessions: 0,
    totalCleans: 0,
    eggTaps: 0,
    evolutionPath: null,
    rareVariant: null,
  };
}

export function PetProvider({ children }: { children: React.ReactNode }) {
  const { gameState } = useGame();
  const lang = gameState?.settings?.language || "en";
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadPet();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pet) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev;
        const newAgeInSeconds = prev.ageInSeconds + 5;
        const newStage = getStage(newAgeInSeconds);
        const stageChanged = newStage !== prev.stage && prev.stage !== "egg";

        let newStats = { ...prev.stats };
        if (!prev.isSleeping) {
          newStats.hunger = Math.max(
            0,
            newStats.hunger - DECAY_RATE_PER_SECOND.hunger * 5
          );
          newStats.happiness = Math.max(
            0,
            newStats.happiness - DECAY_RATE_PER_SECOND.happiness * 5
          );
          newStats.energy = Math.max(
            0,
            newStats.energy - DECAY_RATE_PER_SECOND.energy * 5
          );
          newStats.cleanliness = Math.max(
            0,
            newStats.cleanliness - DECAY_RATE_PER_SECOND.cleanliness * 5
          );
          // Health degrades only under neglect, and never below HEALTH_MIN
          if (newStats.hunger < 20 || newStats.cleanliness < 20) {
            newStats.health = Math.max(
              HEALTH_MIN,
              newStats.health - 0.05
            );
          } else if (newStats.hunger > 40 && newStats.happiness > 40) {
            newStats.health = Math.min(100, newStats.health + 0.02);
          }
        } else {
          newStats.energy = Math.min(100, newStats.energy + 0.2);
          newStats.health = Math.min(100, newStats.health + 0.05);
        }

        let newJournal = prev.journal;
        let newEvolutionPath = prev.evolutionPath;
        let newRareVariant = prev.rareVariant;

        if (stageChanged) {
          const stageNames: Record<PetStage, string> = {
            egg: "an egg",
            baby: "a baby",
            child: "a child",
            teen: "a teenager",
            adult: "an adult",
            elder: "an elder",
          };
          newJournal = addJournalEntry(
            prev.journal,
            { name: `${prev.name}`, eventKey: "eventGrew", stage: stageNames[newStage] },
            "sparkles"
          );
          // Compute evolution path on first evolution (baby -> child)
          if (newStage === "child" && !prev.evolutionPath) {
            newEvolutionPath = computeEvolutionPath(
              prev.totalPlaySessions,
              prev.totalFeedings,
              prev.totalCleans,
              newStats.happiness
            );
            // Roll for rare variant
            newRareVariant = rollRareVariant();
            if (newRareVariant) {
              newJournal = addJournalEntry(
                newJournal,
                { name: "✨", eventKey: "eventRareVariant", variant: newRareVariant },
                "sparkles"
              );
            }
            if (newEvolutionPath) {
              newJournal = addJournalEntry(
                newJournal,
                { name: `${prev.name}`, eventKey: "eventEvolved", path: newEvolutionPath },
                "sparkles"
              );
            }
          }
        }

        const newMood = getMood(newStats, prev.isSleeping);
        const updated: Pet = {
          ...prev,
          stats: newStats,
          stage: prev.stage === "egg" ? "egg" : newStage,
          ageInSeconds: newAgeInSeconds,
          age: Math.floor(newAgeInSeconds / 60),
          mood: newMood,
          journal: newJournal,
          evolutionPath: newEvolutionPath,
          rareVariant: newRareVariant,
        };
        savePet(updated);
        return updated;
      });
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pet?.id]);

  const loadPet = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const saved: Pet = JSON.parse(data);
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - saved.lastInteraction) / 1000);
        const offlineDecay = Math.min(elapsedSeconds, 3600);

        let newStats = { ...saved.stats };
        if (saved.stage !== "egg") {
          newStats.hunger = Math.max(
            0,
            newStats.hunger - DECAY_RATE_PER_SECOND.hunger * offlineDecay
          );
          newStats.happiness = Math.max(
            0,
            newStats.happiness - DECAY_RATE_PER_SECOND.happiness * offlineDecay
          );
          newStats.energy = Math.max(
            0,
            newStats.energy - DECAY_RATE_PER_SECOND.energy * offlineDecay
          );
          newStats.cleanliness = Math.max(
            0,
            newStats.cleanliness - DECAY_RATE_PER_SECOND.cleanliness * offlineDecay
          );
          if (newStats.hunger < 20) {
            newStats.health = Math.max(HEALTH_MIN, newStats.health - 2);
          }
        }

        const newAgeInSeconds = saved.ageInSeconds + elapsedSeconds;
        const newStage = saved.stage === "egg" ? "egg" : getStage(newAgeInSeconds);
        const newMood = getMood(newStats, false);
        const restored: Pet = {
          ...saved,
          stats: newStats,
          ageInSeconds: newAgeInSeconds,
          age: Math.floor(newAgeInSeconds / 60),
          stage: newStage,
          mood: newMood,
          isSleeping: false,
          lastInteraction: now,
          eggTaps: saved.eggTaps ?? 0,
          evolutionPath: saved.evolutionPath ?? null,
          rareVariant: saved.rareVariant ?? null,
        };
        setPet(restored);
      }
    } catch (e) {
      console.error("Failed to load pet:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const savePet = async (petData: Pet) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...petData, lastInteraction: Date.now() })
      );
    } catch (e) {
      console.error("Failed to save pet:", e);
    }
  };

  const updatePet = useCallback((updater: (p: Pet) => Pet) => {
    setPet((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      savePet(updated);
      return updated;
    });
  }, []);

  const createPet = useCallback((name: string) => {
    const newPet = createDefaultPet(name);
    setPet(newPet);
    savePet(newPet);
  }, []);

  /** Called when the user taps the egg. Returns "hatched" if it just hatched. */
  const tapEgg = useCallback((): "tapped" | "hatched" => {
    let result: "tapped" | "hatched" = "tapped";
    setPet((prev) => {
      if (!prev || prev.stage !== "egg") return prev;
      const newTaps = (prev.eggTaps ?? 0) + 1;
      if (newTaps >= EGG_TAPS_TO_HATCH) {
        // Hatch!
        result = "hatched";
        const hatched: Pet = {
          ...prev,
          stage: "baby",
          eggTaps: 0,
          ageInSeconds: STAGE_AGE_THRESHOLDS.baby,
          age: Math.floor(STAGE_AGE_THRESHOLDS.baby / 60),
          mood: getMood(prev.stats, false),
          journal: addJournalEntry(
            prev.journal,
            { name: prev.name, eventKey: "eventHatched" },
            "sparkles"
          ),
          lastInteraction: Date.now(),
        };
        savePet(hatched);
        return hatched;
      } else {
        const tapped: Pet = {
          ...prev,
          eggTaps: newTaps,
          lastInteraction: Date.now(),
        };
        savePet(tapped);
        return tapped;
      }
    });
    return result;
  }, []);

  const feedPet = useCallback(() => {
    updatePet((prev) => {
      if (prev.isSleeping || prev.stage === "egg") return prev;
      const newStats = {
        ...prev.stats,
        hunger: Math.min(100, prev.stats.hunger + 25),
        health: Math.min(100, prev.stats.health + 3),
      };
      return {
        ...prev,
        stats: newStats,
        personality: {
          ...prev.personality,
          foodie: Math.min(100, prev.personality.foodie + 2),
        },
        mood: getMood(newStats, false),
        journal: addJournalEntry(prev.journal, { name: prev.name, eventKey: "eventFeeding" }, "food"),
        totalFeedings: prev.totalFeedings + 1,
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const playWithPet = useCallback(() => {
    updatePet((prev) => {
      if (prev.isSleeping || prev.stage === "egg") return prev;
      const newStats = {
        ...prev.stats,
        happiness: Math.min(100, prev.stats.happiness + 20),
        energy: Math.max(0, prev.stats.energy - 10),
        hunger: Math.max(0, prev.stats.hunger - 5),
      };
      return {
        ...prev,
        stats: newStats,
        personality: {
          ...prev.personality,
          playful: Math.min(100, prev.personality.playful + 2),
          lazy: Math.max(0, prev.personality.lazy - 1),
        },
        mood: getMood(newStats, false),
        journal: addJournalEntry(
          prev.journal,
          { name: prev.name, eventKey: "eventPlaying" },
          "play"
        ),
        totalPlaySessions: prev.totalPlaySessions + 1,
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const cleanPet = useCallback(() => {
    updatePet((prev) => {
      if (prev.isSleeping || prev.stage === "egg") return prev;
      const newStats = {
        ...prev.stats,
        cleanliness: 100,
        health: Math.min(100, prev.stats.health + 5),
        happiness: Math.min(100, prev.stats.happiness + 5),
      };
      return {
        ...prev,
        stats: newStats,
        mood: getMood(newStats, false),
        journal: addJournalEntry(
          prev.journal,
          { name: prev.name, eventKey: "eventCleaned" },
          "clean"
        ),
        totalCleans: prev.totalCleans + 1,
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const healPet = useCallback(() => {
    updatePet((prev) => {
      if (prev.isSleeping || prev.stage === "egg") return prev;
      const newStats = {
        ...prev.stats,
        health: Math.min(100, prev.stats.health + 35),
        happiness: Math.max(0, prev.stats.happiness - 5),
      };
      return {
        ...prev,
        stats: newStats,
        mood: getMood(newStats, false),
        journal: addJournalEntry(
          prev.journal,
          { name: prev.name, eventKey: "eventMedicine" },
          "heal"
        ),
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const toggleSleep = useCallback(() => {
    updatePet((prev) => {
      if (prev.stage === "egg") return prev;
      const sleeping = !prev.isSleeping;
      return {
        ...prev,
        isSleeping: sleeping,
        mood: getMood(prev.stats, sleeping),
        journal: addJournalEntry(
          prev.journal,
          { name: prev.name, eventKey: sleeping ? "eventSleep" : "eventWakeUp" },
          sleeping ? "sleep" : "wake"
        ),
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const resetPet = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    setPet(null);
  }, []);

  const applyStatBoost = useCallback((stat: string, amount: number) => {
    updatePet((prev) => {
      if (prev.stage === "egg") return prev;
      const newStats = { ...prev.stats } as any;
      if (stat in newStats) {
        newStats[stat] = Math.min(100, (newStats[stat] as number) + amount);
      }
      return {
        ...prev,
        stats: newStats,
        mood: getMood(newStats, prev.isSleeping),
        lastInteraction: Date.now(),
      };
    });
  }, [updatePet]);

  const value = useMemo(
    () => ({
      pet,
      isLoading,
      createPet,
      feedPet,
      playWithPet,
      cleanPet,
      healPet,
      toggleSleep,
      tapEgg,
      resetPet,
      applyStatBoost,
    }),
    [
      pet,
      isLoading,
      createPet,
      feedPet,
      playWithPet,
      cleanPet,
      healPet,
      toggleSleep,
      tapEgg,
      resetPet,
      applyStatBoost,
    ]
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used within PetProvider");
  return ctx;
}
