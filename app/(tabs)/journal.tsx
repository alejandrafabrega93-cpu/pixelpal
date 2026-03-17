import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, getTheme } from "@/constants/colors";
import { JournalEntry, usePet } from "@/context/PetContext";
import { useGame } from "@/context/GameContext";
import { t } from "@/constants/i18n";

const ICON_MAP: Record<string, string> = {
  food: "🍖",
  play: "★",
  clean: "~",
  heal: "+",
  sleep: "z",
  wake: "◆",
  sparkles: "✦",
  egg: "●",
  born: "●",
};

function getRelativeTime(timestamp: number, lang: string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t(lang, "justNow");
  if (minutes < 60) return `${minutes}${t(lang, "mAgo")}`;
  if (hours < 24) return `${hours}${t(lang, "hAgo")}`;
  return `${days}${t(lang, "dAgo")}`;
}

function JournalItem({ item, index, lang }: { item: JournalEntry; index: number; lang: string }) {
  const icon = ICON_MAP[item.icon] || "◆";
  const isRecent = Date.now() - item.timestamp < 60000;

  let eventText = "";
  if (typeof item.event === "string") {
    // Legacy format: translate old English phrases
    const legacyEvent = item.event;
    
    // Map of English phrases to translation keys
    const legacyMap: Record<string, string> = {
      "went to sleep... zzz": "eventSleep",
      "woke up refreshed!": "eventWakeUp",
      "ate a tasty meal": "eventFeeding",
      "had so much fun playing!": "eventPlaying",
      "got squeaky clean!": "eventCleaned",
      "took medicine and feels better": "eventMedicine",
      "hatched! Welcome to the world!": "eventHatched",
      "egg appeared in the nest!": "eventEggAppeared",
    };
    
    let translated = false;
    for (const [englishPhrase, key] of Object.entries(legacyMap)) {
      if (legacyEvent.includes(englishPhrase)) {
        // Extract pet name (everything before the first English phrase)
        const idx = legacyEvent.indexOf(englishPhrase);
        let petName = legacyEvent.substring(0, idx).trim();
        // Remove trailing apostrophe/possessive if present
        if (petName.endsWith("'s")) {
          petName = petName.slice(0, -2);
        }
        eventText = `${petName} ${t(lang, key as any)}`;
        translated = true;
        break;
      }
    }
    
    // If no legacy phrase matched, use as-is
    if (!translated) {
      eventText = legacyEvent;
    }
  } else {
    const { name, eventKey, stage, path, variant } = item.event;
    const eKey = eventKey as import("@/constants/i18n").TranslationKeys;
    if (eventKey === "eventGrew") {
      eventText = `${name} ${t(lang, eKey)} ${stage}!`;
    } else if (eventKey === "eventRareVariant") {
      eventText = `${name} ${t(lang, eKey)} ${variant} variant emerged!`;
    } else if (eventKey === "eventEvolved") {
      eventText = `${name} ${t(lang, eKey)} ${path} path!`;
    } else if (eventKey === "eventEggAppeared") {
      eventText = `${name} ${t(lang, eKey)}`;
    } else {
      eventText = `${name} ${t(lang, eKey)}`;
    }
  }

  return (
    <View style={[entryStyles.container, index === 0 && isRecent && entryStyles.recent]}>
      <View style={entryStyles.iconWrap}>
        <Text style={entryStyles.icon}>{icon}</Text>
      </View>
      <View style={entryStyles.body}>
        <Text style={entryStyles.event}>{eventText}</Text>
        <Text style={entryStyles.time}>{getRelativeTime(item.timestamp, lang)}</Text>
      </View>
      {index === 0 && isRecent && <View style={entryStyles.newDot} />}
    </View>
  );
}

const entryStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 14,
  },
  recent: { backgroundColor: Colors.primary + "0A" },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.bgCardAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  icon: { fontSize: 16, color: Colors.primary },
  body: { flex: 1 },
  event: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
});

export default function JournalScreen() {
  const { pet } = usePet();
  const { gameState } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const theme = getTheme(gameState.settings.highContrastMode);
  const lang = gameState.settings.language;

  if (!pet) return null;

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: theme.bg }]}>
      <LinearGradient colors={[theme.bgCardAlt, theme.bg]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t(lang, "journal")}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {pet.journal.length} {t(lang, "entries")}
        </Text>
      </View>

      <View style={[styles.listCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <FlatList
          data={pet.journal}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <JournalItem item={item} index={index} lang={lang} />}
          scrollEnabled={!!pet.journal.length}
          contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◆</Text>
              <Text style={styles.emptyText}>{t(lang, "noEntries")}</Text>
              <Text style={styles.emptySubtext}>{t(lang, "careForPet")}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  listCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
