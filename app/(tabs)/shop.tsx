import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, getTheme } from "@/constants/colors";
import { useGame, SHOP_ITEMS, ShopItem } from "@/context/GameContext";
import { usePet } from "@/context/PetContext";
import { t } from "@/constants/i18n";
import { playClick, playSound } from "@/utils/audio";

const CATEGORIES = ["cosmetics", "boosts"] as const;
type CategoryTab = (typeof CATEGORIES)[number];

const IAP_PACKS = [
  { id: "pack_small", labelKey: "packSmall" as const, amount: 500, price: "$0.99", emoji: "🪙" },
  { id: "pack_medium", labelKey: "packMedium" as const, amount: 1500, price: "$2.49", emoji: "💰" },
  { id: "pack_large", labelKey: "packLarge" as const, amount: 5000, price: "$6.99", emoji: "💎" },
];

function ItemCard({
  item,
  owned,
  equipped,
  canAfford,
  boostQty,
  onBuy,
  onEquip,
  onUnequip,
  lang,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  boostQty: number;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  lang: string;
}) {
  const isBoost = item.category === "boost";

  return (
    <View style={[styles.itemCard, equipped && styles.itemCardEquipped]}>
      {equipped && (
        <View style={styles.equippedBadge}>
          <Text style={styles.equippedBadgeText}>✓</Text>
        </View>
      )}
      <Text style={styles.itemEmoji}>{item.emoji}</Text>
      <Text style={styles.itemName}>{t(lang, item.nameKey as any)}</Text>
      <Text style={styles.itemDesc}>{t(lang, item.descKey as any)}</Text>
      <View style={styles.itemPrice}>
        <Text style={styles.coinIcon}>🪙</Text>
        <Text style={styles.priceText}>{item.price}</Text>
      </View>
      {isBoost && boostQty > 0 && (
        <Text style={styles.qtyText}>x{boostQty} {t(lang, "inStock")}</Text>
      )}
      {owned && !isBoost ? (
        equipped ? (
          <Pressable
            style={[styles.actionBtn, styles.actionBtnRemove]}
            onPress={() => { playClick(); onUnequip(); }}
          >
            <Text style={[styles.actionBtnText, { color: Colors.textMuted }]}>
              {t(lang, "remove")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.actionBtn}
            onPress={() => { playClick(); onEquip(); }}
          >
            <Text style={styles.actionBtnText}>{t(lang, "equip")}</Text>
          </Pressable>
        )
      ) : isBoost && boostQty > 0 ? (
        <Pressable style={styles.actionBtn} onPress={() => { playClick(); onEquip(); }}>
          <Text style={styles.actionBtnText}>{t(lang, "useNow")}</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.actionBtn, !canAfford && styles.actionBtnDisabled]}
          onPress={() => { playClick(); onBuy(); }}
          disabled={!canAfford}
        >
          <Text style={[styles.actionBtnText, !canAfford && { color: Colors.textMuted }]}>
            {t(lang, "buy")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { gameState, purchaseItem, equipItem, unequipItem, useBoost, claimIAPPreview, iapPreviewClaimed } = useGame();
  const { pet, applyStatBoost } = usePet();
  const [activeTab, setActiveTab] = useState<CategoryTab>("cosmetics");
  const [showIAP, setShowIAP] = useState(false);
  const lang = gameState.settings.language;
  const theme = getTheme(gameState.settings.highContrastMode);

  const cosmeticItems = SHOP_ITEMS.filter((i) => i.category !== "boost");
  const boostItems = SHOP_ITEMS.filter((i) => i.category === "boost");
  const displayItems = activeTab === "cosmetics" ? cosmeticItems : boostItems;

  const handleBuy = (item: ShopItem) => {
    if (gameState.glowbits < item.price) {
      Alert.alert(t(lang, "notEnoughGlowbits"), t(lang, "earnMore"));
      return;
    }
    const ok = purchaseItem(item);
    if (ok) {
      if (gameState.settings.soundEnabled) playSound("reward");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (item.category !== "boost") {
        equipItem(item);
      }
    }
  };

  const handleUseBoost = (item: ShopItem) => {
    if (!pet || pet.stage === "egg") {
      Alert.alert(t(lang, "noPet"), t(lang, "hatchFirst"));
      return;
    }
    const ok = useBoost(item.id, (stat, amount) => {
      applyStatBoost(stat, amount);
    });
    if (!ok) {
      Alert.alert(t(lang, "noneLeft"), t(lang, "purchaseMore"));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleIAPPack = (pack: (typeof IAP_PACKS)[0]) => {
    if (iapPreviewClaimed) {
      Alert.alert(t(lang, "comingSoon"), t(lang, "iapPreviewUsed"));
      return;
    }
    Alert.alert(
      t(lang, "comingSoon"),
      t(lang, "iapPreview"),
      [
        { text: t(lang, "cancel"), style: "cancel" },
        {
          text: t(lang, "addFree"),
          onPress: () => {
            const claimed = claimIAPPreview(pack.amount);
            if (claimed) {
              setShowIAP(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (gameState.settings.soundEnabled) playSound("reward");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t(lang, "shop")}</Text>
          <Text style={styles.subtitle}>{t(lang, "spendGlowbits")}</Text>
        </View>
        <View style={styles.glowbitsBox}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.glowbitsNum}>{gameState.glowbits.toLocaleString()}</Text>
        </View>
      </View>

      <Pressable style={styles.getGlowbitsBtn} onPress={() => { playClick(); setShowIAP(true); }}>
        <Text style={styles.getGlowbitsText}>✨ {t(lang, "getGlowbits")}</Text>
      </Pressable>

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.tab, activeTab === cat && styles.tabActive]}
            onPress={() => { playClick(); setActiveTab(cat); }}
          >
            <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>
              {cat === "cosmetics" ? t(lang, "cosmetics") : t(lang, "boosts")}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "boosts" && (
          <Text style={styles.boostHint}>{t(lang, "boostsHint")}</Text>
        )}
        <View style={styles.itemsRow}>
          {displayItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owned={gameState.inventory.includes(item.id)}
              equipped={gameState.equipped[item.category] === item.id}
              canAfford={gameState.glowbits >= item.price}
              boostQty={gameState.boosts[item.id] ?? 0}
              onBuy={() => handleBuy(item)}
              onEquip={() => {
                if (item.category === "boost") {
                  handleUseBoost(item);
                } else {
                  equipItem(item);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              onUnequip={() => {
                unequipItem(item.category);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              lang={lang}
            />
          ))}
        </View>
      </ScrollView>

      <Modal visible={showIAP} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t(lang, "getGlowbits")} ✨</Text>
            <Text style={styles.modalSubtitle}>{t(lang, "paymentComingSoon")}</Text>
            {IAP_PACKS.map((pack) => (
              <Pressable
                key={pack.id}
                style={[styles.packRow, iapPreviewClaimed && { opacity: 0.5 }]}
                onPress={() => { playClick(); handleIAPPack(pack); }}
              >
                <Text style={styles.packEmoji}>{pack.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packLabel}>{t(lang, pack.labelKey)}</Text>
                  <Text style={styles.packAmount}>{pack.amount.toLocaleString()} {t(lang, "glowbits")}</Text>
                </View>
                <View style={styles.packPriceBox}>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                </View>
              </Pressable>
            ))}
            {iapPreviewClaimed && (
              <Text style={styles.iapDisclaimer}>{t(lang, "iapPreviewUsed")}</Text>
            )}
            <Pressable style={styles.closeBtn} onPress={() => { playClick(); setShowIAP(false); }}>
              <Text style={styles.closeBtnText}>{t(lang, "close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
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
  glowbitsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.accent + "50",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinEmoji: { fontSize: 16 },
  glowbitsNum: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  getGlowbitsBtn: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.accent + "18",
    borderWidth: 1,
    borderColor: Colors.accent + "50",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  getGlowbitsText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: Colors.bgCardAlt },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: { color: Colors.text },
  grid: { paddingHorizontal: 20 },
  boostHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
  },
  itemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  itemCard: {
    width: "47%",
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: "center",
    gap: 5,
  },
  itemCardEquipped: {
    borderColor: Colors.primary + "80",
    backgroundColor: Colors.primary + "0A",
  },
  equippedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  equippedBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.bg,
  },
  itemEmoji: { fontSize: 32, marginBottom: 2 },
  itemName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  itemDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
  },
  itemPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  coinIcon: { fontSize: 12 },
  priceText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  qtyText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  actionBtn: {
    marginTop: 6,
    backgroundColor: Colors.primary + "20",
    borderWidth: 1,
    borderColor: Colors.primary + "60",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    width: "100%",
    alignItems: "center",
  },
  actionBtnRemove: {
    backgroundColor: Colors.bgCardAlt,
    borderColor: Colors.border,
  },
  actionBtnDisabled: {
    backgroundColor: Colors.bgCardAlt,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 20,
  },
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  packEmoji: { fontSize: 28 },
  packLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  packAmount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    marginTop: 2,
  },
  packPriceBox: {
    backgroundColor: Colors.primary + "20",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "50",
  },
  packPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  iapDisclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  closeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
});
