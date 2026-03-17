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
import { Platform } from "react-native";
import { setSoundEnabled } from "@/utils/audio";

export type ItemCategory = "hat" | "glasses" | "costume" | "skin" | "boost";

export interface ShopItem {
  id: string;
  nameKey: string;
  emoji: string;
  category: ItemCategory;
  price: number;
  descKey: string;
}

const BOOST_STAT_MAP: Record<string, { stat: string; amount: number }> = {
  boost_happy: { stat: "happiness", amount: 20 },
  boost_energy: { stat: "energy", amount: 20 },
  boost_clean: { stat: "cleanliness", amount: 20 },
  boost_heal: { stat: "health", amount: 20 },
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "hat_crown", nameKey: "itemCrown", emoji: "👑", category: "hat", price: 150, descKey: "itemCrownDesc" },
  { id: "hat_tophat", nameKey: "itemTopHat", emoji: "🎩", category: "hat", price: 120, descKey: "itemTopHatDesc" },
  { id: "costume_party", nameKey: "itemParty", emoji: "🎈", category: "costume", price: 80, descKey: "itemPartyDesc" },
  { id: "costume_wand", nameKey: "itemWand", emoji: "🪄", category: "costume", price: 200, descKey: "itemWandDesc" },
  { id: "costume_wizard", nameKey: "itemWizard", emoji: "🔮", category: "costume", price: 300, descKey: "itemWizardDesc" },
  { id: "costume_knight", nameKey: "itemKnight", emoji: "🛡️", category: "costume", price: 350, descKey: "itemKnightDesc" },
  { id: "costume_chef", nameKey: "itemChef", emoji: "🍳", category: "costume", price: 250, descKey: "itemChefDesc" },
  { id: "boost_happy", nameKey: "itemHappy", emoji: "🍬", category: "boost", price: 30, descKey: "itemHappyDesc" },
  { id: "boost_energy", nameKey: "itemEnergy", emoji: "⚡", category: "boost", price: 35, descKey: "itemEnergyDesc" },
  { id: "boost_clean", nameKey: "itemBubble", emoji: "🫧", category: "boost", price: 25, descKey: "itemBubbleDesc" },
  { id: "boost_heal", nameKey: "itemHealing", emoji: "🩹", category: "boost", price: 40, descKey: "itemHealingDesc" },
];

const STREAK_REWARDS: Record<number, { glowbits: number; cosmetic?: string }> = {
  1: { glowbits: 20 },
  2: { glowbits: 30 },
  3: { glowbits: 40 },
  4: { glowbits: 50 },
  5: { glowbits: 60 },
  6: { glowbits: 80 },
  7: { glowbits: 120, cosmetic: "hat_crown" },
};

const MYSTERY_BOX_REWARDS = [10, 20, 30, 50];
const MAX_ARCADE_REWARDS_PER_SESSION = 6;

export interface GameSettings {
  language: string;
  musicEnabled: boolean;
  soundEnabled: boolean;
  highContrastMode: boolean;
  notificationsEnabled: boolean;
}

interface GameState {
  glowbits: number;
  inventory: string[];
  equipped: Record<string, string>;
  boosts: Record<string, number>;
  streak: { count: number; lastLogin: string };
  settings: GameSettings;
  mysteryBox: { lastOpened: string };
}

const DEFAULT_STATE: GameState = {
  glowbits: 100,
  inventory: [],
  equipped: {},
  boosts: {},
  streak: { count: 0, lastLogin: "" },
  settings: {
    language: "en",
    musicEnabled: true,
    soundEnabled: true,
    highContrastMode: false,
    notificationsEnabled: true,
  },
  mysteryBox: { lastOpened: "" },
};

interface GameContextValue {
  gameState: GameState;
  addGlowbits: (amount: number) => void;
  purchaseItem: (item: ShopItem) => boolean;
  equipItem: (item: ShopItem) => void;
  unequipItem: (category: string) => void;
  useBoost: (id: string, applyBoost: (stat: string, amount: number) => void) => boolean;
  updateSettings: (partial: Partial<GameSettings>) => void;
  checkAndClaimStreak: () => { glowbits: number; day: number; cosmetic?: string } | null;
  scheduleNotification: (title: string, body: string, seconds: number) => void;
  claimMysteryBox: () => number | null;
  getMysteryBoxCooldown: () => number;
  claimArcadeReward: (score: number) => number;
  arcadeGamesLeft: number;
  claimIAPPreview: (amount: number) => boolean;
  iapPreviewClaimed: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);
const STORAGE_KEY = "@pixelpal_game_v1";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const stateRef = useRef<GameState>(DEFAULT_STATE);
  stateRef.current = gameState;

  const iapPreviewRef = useRef(false);
  const [iapPreviewClaimed, setIapPreviewClaimed] = useState(false);
  const arcadeGamesRef = useRef(0);
  const [arcadeGamesLeft, setArcadeGamesLeft] = useState(MAX_ARCADE_REWARDS_PER_SESSION);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const saved = JSON.parse(data) as Partial<GameState>;
        const merged: GameState = {
          ...DEFAULT_STATE,
          ...saved,
          settings: { ...DEFAULT_STATE.settings, ...(saved.settings ?? {}) },
          mysteryBox: { ...DEFAULT_STATE.mysteryBox, ...(saved.mysteryBox ?? {}) },
        };
        setGameState(merged);
        stateRef.current = merged;
        setSoundEnabled(merged.settings.soundEnabled);
      } else {
        setSoundEnabled(DEFAULT_STATE.settings.soundEnabled);
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
    }
  };

  const saveState = useCallback(async (state: GameState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save game state:", e);
    }
  }, []);

  const updateState = useCallback(
    (updater: (s: GameState) => GameState) => {
      setGameState((prev) => {
        const next = updater(prev);
        stateRef.current = next;
        saveState(next);
        return next;
      });
    },
    [saveState]
  );

  const addGlowbits = useCallback(
    (amount: number) => {
      updateState((s) => ({ ...s, glowbits: s.glowbits + amount }));
    },
    [updateState]
  );

  const purchaseItem = useCallback(
    (item: ShopItem): boolean => {
      let success = false;
      updateState((s) => {
        if (s.glowbits < item.price) return s;
        if (s.inventory.includes(item.id) && item.category !== "boost") return s;
        success = true;
        const newBoosts = { ...s.boosts };
        if (item.category === "boost") {
          newBoosts[item.id] = (newBoosts[item.id] ?? 0) + 1;
        }
        return {
          ...s,
          glowbits: s.glowbits - item.price,
          inventory: s.inventory.includes(item.id) ? s.inventory : [...s.inventory, item.id],
          boosts: newBoosts,
        };
      });
      return success;
    },
    [updateState]
  );

  const equipItem = useCallback(
    (item: ShopItem) => {
      updateState((s) => ({
        ...s,
        equipped: { ...s.equipped, [item.category]: item.id },
      }));
    },
    [updateState]
  );

  const unequipItem = useCallback(
    (category: string) => {
      updateState((s) => {
        const newEquipped = { ...s.equipped };
        delete newEquipped[category];
        return { ...s, equipped: newEquipped };
      });
    },
    [updateState]
  );

  const useBoost = useCallback(
    (id: string, applyBoost: (stat: string, amount: number) => void): boolean => {
      const boostInfo = BOOST_STAT_MAP[id];
      if (!boostInfo) return false;
      let success = false;
      updateState((s) => {
        const qty = s.boosts[id] ?? 0;
        if (qty <= 0) return s;
        success = true;
        return { ...s, boosts: { ...s.boosts, [id]: qty - 1 } };
      });
      if (success) applyBoost(boostInfo.stat, boostInfo.amount);
      return success;
    },
    [updateState]
  );

  const updateSettings = useCallback(
    (partial: Partial<GameSettings>) => {
      if (partial.soundEnabled !== undefined) {
        setSoundEnabled(partial.soundEnabled);
      }
      updateState((s) => ({ ...s, settings: { ...s.settings, ...partial } }));
    },
    [updateState]
  );

  const checkAndClaimStreak = useCallback((): {
    glowbits: number;
    day: number;
    cosmetic?: string;
  } | null => {
    const today = new Date().toISOString().split("T")[0];
    const s = stateRef.current;
    if (s.streak.lastLogin === today) return null;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    const newCount = s.streak.lastLogin === yStr ? Math.min(s.streak.count + 1, 7) : 1;
    const reward = STREAK_REWARDS[newCount] ?? STREAK_REWARDS[7];

    updateState((prev) => {
      const next: GameState = {
        ...prev,
        glowbits: prev.glowbits + reward.glowbits,
        streak: { count: newCount, lastLogin: today },
      };
      if (reward.cosmetic && !prev.inventory.includes(reward.cosmetic)) {
        next.inventory = [...prev.inventory, reward.cosmetic];
      }
      return next;
    });

    return { glowbits: reward.glowbits, day: newCount, cosmetic: reward.cosmetic };
  }, [updateState]);

  const scheduleNotification = useCallback(
    async (title: string, body: string, seconds: number) => {
      if (Platform.OS === "web") return;
      if (!stateRef.current.settings.notificationsEnabled) return;
      try {
        const Notifications = await import("expo-notifications");
        await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: { seconds, type: "timeInterval" } as any,
        });
      } catch (e) {}
    },
    []
  );

  const claimMysteryBox = useCallback((): number | null => {
    const s = stateRef.current;
    const now = Date.now();
    if (s.mysteryBox.lastOpened) {
      const elapsed = now - new Date(s.mysteryBox.lastOpened).getTime();
      if (elapsed < 24 * 60 * 60 * 1000) return null;
    }
    const reward = MYSTERY_BOX_REWARDS[Math.floor(Math.random() * MYSTERY_BOX_REWARDS.length)];
    updateState((prev) => ({
      ...prev,
      glowbits: prev.glowbits + reward,
      mysteryBox: { lastOpened: new Date().toISOString() },
    }));
    return reward;
  }, [updateState]);

  const getMysteryBoxCooldown = useCallback((): number => {
    const s = stateRef.current;
    if (!s.mysteryBox.lastOpened) return 0;
    const elapsed = Date.now() - new Date(s.mysteryBox.lastOpened).getTime();
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    return Math.max(0, remaining);
  }, []);

  const claimArcadeReward = useCallback((score: number): number => {
    if (arcadeGamesRef.current >= MAX_ARCADE_REWARDS_PER_SESSION) return 0;
    arcadeGamesRef.current++;
    setArcadeGamesLeft(MAX_ARCADE_REWARDS_PER_SESSION - arcadeGamesRef.current);
    const reward = glowbitsForScore(score);
    if (reward > 0) {
      updateState((s) => ({ ...s, glowbits: s.glowbits + reward }));
    }
    return reward;
  }, [updateState]);

  const claimIAPPreview = useCallback((amount: number): boolean => {
    if (iapPreviewRef.current) return false;
    iapPreviewRef.current = true;
    setIapPreviewClaimed(true);
    updateState((s) => ({ ...s, glowbits: s.glowbits + amount }));
    return true;
  }, [updateState]);

  const value = useMemo(
    () => ({
      gameState,
      addGlowbits,
      purchaseItem,
      equipItem,
      unequipItem,
      useBoost,
      updateSettings,
      checkAndClaimStreak,
      scheduleNotification,
      claimMysteryBox,
      getMysteryBoxCooldown,
      claimArcadeReward,
      arcadeGamesLeft,
      claimIAPPreview,
      iapPreviewClaimed,
    }),
    [
      gameState,
      addGlowbits,
      purchaseItem,
      equipItem,
      unequipItem,
      useBoost,
      updateSettings,
      checkAndClaimStreak,
      scheduleNotification,
      claimMysteryBox,
      getMysteryBoxCooldown,
      claimArcadeReward,
      arcadeGamesLeft,
      claimIAPPreview,
      iapPreviewClaimed,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

function glowbitsForScore(score: number): number {
  if (score <= 0) return 3;
  if (score <= 5) return 5;
  if (score <= 10) return 8;
  if (score <= 15) return 12;
  if (score <= 20) return 16;
  return 20;
}

export { BOOST_STAT_MAP };
