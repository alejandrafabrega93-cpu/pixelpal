import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors, getTheme } from "@/constants/colors";
import { useGame } from "@/context/GameContext";
import { usePet } from "@/context/PetContext";
import { t, LANGUAGE_LABELS, Language } from "@/constants/i18n";
import { playClick } from "@/utils/audio";

const APP_VERSION = "1.0.0";

const LANGUAGES: Language[] = ["en", "es", "fr", "de", "pt", "ja", "ko", "zh-CN", "zh-TW"];

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { gameState, updateSettings } = useGame();
  const { resetPet } = usePet();
  const { settings } = gameState;
  const lang = settings.language;
  const theme = getTheme(settings.highContrastMode);

  const toggle = (key: keyof typeof settings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings.soundEnabled) playClick();
    updateSettings({ [key]: !settings[key] } as any);
  };

  const handleReset = () => {
    Alert.alert(
      t(lang, "resetTitle"),
      t(lang, "resetMessage"),
      [
        { text: t(lang, "cancel"), style: "cancel" },
        {
          text: t(lang, "resetConfirm"),
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await resetPet();
            router.replace("/create");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>{t(lang, "settings")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      >
        <SectionHeader title={t(lang, "language")} />
        <View style={styles.card}>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l}
                style={[styles.langBtn, settings.language === l && styles.langBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  playClick();
                  updateSettings({ language: l });
                }}
              >
                <Text style={[styles.langBtnText, settings.language === l && styles.langBtnTextActive]}>
                  {LANGUAGE_LABELS[l]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionHeader title={t(lang, "audio")} />
        <View style={styles.card}>
          <SettingRow label={t(lang, "backgroundMusic")}>
            <Switch
              value={settings.musicEnabled}
              onValueChange={() => toggle("musicEnabled")}
              trackColor={{ false: Colors.border, true: Colors.primary + "80" }}
              thumbColor={settings.musicEnabled ? Colors.primary : Colors.textMuted}
            />
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label={t(lang, "buttonSounds")}>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggle("soundEnabled")}
              trackColor={{ false: Colors.border, true: Colors.primary + "80" }}
              thumbColor={settings.soundEnabled ? Colors.primary : Colors.textMuted}
            />
          </SettingRow>
        </View>

        <SectionHeader title={t(lang, "accessibility")} />
        <View style={styles.card}>
          <SettingRow label={t(lang, "highContrast")}>
            <Switch
              value={settings.highContrastMode}
              onValueChange={() => toggle("highContrastMode")}
              trackColor={{ false: Colors.border, true: Colors.info + "80" }}
              thumbColor={settings.highContrastMode ? Colors.info : Colors.textMuted}
            />
          </SettingRow>
        </View>

        <SectionHeader title={t(lang, "notifications")} />
        <View style={styles.card}>
          <SettingRow label={t(lang, "enableNotifications")}>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={() => toggle("notificationsEnabled")}
              trackColor={{ false: Colors.border, true: Colors.primary + "80" }}
              thumbColor={settings.notificationsEnabled ? Colors.primary : Colors.textMuted}
            />
          </SettingRow>
          {settings.notificationsEnabled && (
            <Text style={styles.notifHint}>{t(lang, "notifHint")}</Text>
          )}
        </View>

        <SectionHeader title={t(lang, "dailyStreak")} />
        <View style={styles.card}>
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakCount}>
                {t(lang, "day")} {gameState.streak.count} {t(lang, "streak")}
              </Text>
              <Text style={styles.streakSub}>
                {gameState.streak.lastLogin
                  ? `${t(lang, "lastLogin")}: ${gameState.streak.lastLogin}`
                  : t(lang, "noLoginYet")}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.streakRewardsTitle}>{t(lang, "streakRewards")}</Text>
          {[
            { day: 1, g: 20 }, { day: 2, g: 30 }, { day: 3, g: 40 },
            { day: 4, g: 50 }, { day: 5, g: 60 }, { day: 6, g: 80 },
            { day: 7, g: 120, extra: `👑 ${t(lang, "crownReward")}` },
          ].map(({ day, g, extra }) => (
            <View key={day} style={[styles.rewardRow, gameState.streak.count >= day && styles.rewardRowClaimed]}>
              <Text style={styles.rewardDay}>{t(lang, "day")} {day}</Text>
              <Text style={styles.rewardAmt}>🪙 {g}{extra ? ` + ${extra}` : ""}</Text>
              {gameState.streak.count >= day && <Text style={styles.rewardCheck}>✓</Text>}
            </View>
          ))}
        </View>

        <SectionHeader title={t(lang, "game")} />
        <View style={styles.card}>
          <SettingRow label={t(lang, "version")}>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </SettingRow>
        </View>

        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.75 }]}
          onPress={() => { playClick(); handleReset(); }}
        >
          <Text style={styles.resetBtnText}>{t(lang, "resetProgress")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    paddingRight: 8,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.bgCardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langBtnActive: {
    backgroundColor: Colors.primary + "20",
    borderColor: Colors.primary + "70",
  },
  langBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  langBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  notifHint: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  streakEmoji: { fontSize: 28 },
  streakCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  streakSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  streakRewardsTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    opacity: 0.5,
  },
  rewardRowClaimed: { opacity: 1 },
  rewardDay: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    width: 55,
  },
  rewardAmt: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  rewardCheck: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  versionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  resetBtn: {
    marginTop: 20,
    backgroundColor: Colors.danger + "15",
    borderWidth: 1,
    borderColor: Colors.danger + "40",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
    letterSpacing: 0.3,
  },
});
