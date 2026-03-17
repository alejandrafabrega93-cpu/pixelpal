import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_KEY = "@pixelpal_notif_count";
const NOTIF_DATE_KEY = "@pixelpal_notif_date";
const MAX_PER_DAY = 3;

async function canSendNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const today = new Date().toISOString().split("T")[0];
    const [count, date] = await Promise.all([
      AsyncStorage.getItem(NOTIF_KEY),
      AsyncStorage.getItem(NOTIF_DATE_KEY),
    ]);
    if (date !== today) {
      await Promise.all([
        AsyncStorage.setItem(NOTIF_KEY, "0"),
        AsyncStorage.setItem(NOTIF_DATE_KEY, today),
      ]);
      return true;
    }
    return parseInt(count ?? "0") < MAX_PER_DAY;
  } catch {
    return false;
  }
}

async function incrementNotifCount() {
  try {
    const count = await AsyncStorage.getItem(NOTIF_KEY);
    await AsyncStorage.setItem(NOTIF_KEY, String(parseInt(count ?? "0") + 1));
  } catch {}
}

export async function scheduleStatNotification(
  petName: string,
  triggerType: "hungry" | "bored" | "dirty" | "evolution" | "daily",
  enabled: boolean,
  delaySeconds = 3600
) {
  if (!enabled || Platform.OS === "web") return;
  const ok = await canSendNotification();
  if (!ok) return;

  const messages: Record<string, { title: string; body: string }> = {
    hungry: {
      title: "🍖 Hungry!",
      body: `${petName} is hungry and needs a snack!`,
    },
    bored: {
      title: "🎮 Bored!",
      body: `${petName} is bored. Come play!`,
    },
    dirty: {
      title: "🛁 Needs a bath!",
      body: `${petName} is getting dirty. Time for a clean!`,
    },
    evolution: {
      title: "✨ Ready to Evolve!",
      body: `${petName} is ready for the next stage!`,
    },
    daily: {
      title: "🔥 Daily Reward!",
      body: "Your daily reward is waiting. Keep that streak going!",
    },
  };

  const msg = messages[triggerType];
  if (!msg) return;

  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body },
      trigger: { seconds: delaySeconds, type: "timeInterval" } as any,
    });
    await incrementNotifCount();
  } catch {
    // notifications unavailable
  }
}
