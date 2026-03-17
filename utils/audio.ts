import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

type SoundName = "click" | "feed" | "play" | "clean" | "reward";

const TONES: Record<SoundName, { freq: number; dur: number }> = {
  click: { freq: 880, dur: 0.07 },
  feed: { freq: 440, dur: 0.18 },
  play: { freq: 660, dur: 0.22 },
  clean: { freq: 520, dur: 0.15 },
  reward: { freq: 1047, dur: 0.3 },
};

let webAudioCtx: any = null;
let bgInterval: ReturnType<typeof setInterval> | null = null;
let bgMusicPlaying = false;
let soundEnabled = true;

function getAudioCtx(): any {
  if (Platform.OS !== "web") return null;
  try {
    if (!webAudioCtx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      webAudioCtx = new AC();
    }
    if (webAudioCtx.state === "suspended") {
      webAudioCtx.resume().catch(() => {});
    }
    return webAudioCtx;
  } catch (e) {
    return null;
  }
}

function playTone(freq: number, dur: number, type: string = "sine", volume = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

let nativeSounds: Record<string, any> = {};
let bgSoundObj: any = null;
let nativeInited = false;
let initPromise: Promise<void> | null = null;

const SOUND_ASSETS: Record<SoundName, any> = {
  click: require("@/assets/sounds/click.wav"),
  feed: require("@/assets/sounds/feed.wav"),
  play: require("@/assets/sounds/play_tone.wav"),
  clean: require("@/assets/sounds/clean.wav"),
  reward: require("@/assets/sounds/reward.wav"),
};
const BG_ASSET = require("@/assets/sounds/bg_music.wav");

export async function initAudio(): Promise<void> {
  if (Platform.OS === "web" || nativeInited) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – expo-av types resolved at runtime via pnpm workspace
      const { Audio } = await import("expo-av");
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      for (const [name, asset] of Object.entries(SOUND_ASSETS)) {
        const { sound } = await Audio.Sound.createAsync(asset);
        nativeSounds[name] = sound;
      }

      const { sound: bgS } = await Audio.Sound.createAsync(BG_ASSET, {
        isLooping: true,
        volume: 0.15,
      });
      bgSoundObj = bgS;

      nativeInited = true;
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  })();
  return initPromise;
}

export function playSound(name: SoundName) {
  if (Platform.OS !== "web") {
    if (name === "reward") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (name === "click") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const sound = nativeSounds[name];
    if (sound) {
      sound
        .setPositionAsync(0)
        .then(() => sound.playAsync())
        .catch(() => {});
    }
    return;
  }
  const tone = TONES[name];
  if (tone) playTone(tone.freq, tone.dur);
}

let lastClickAt = 0;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function playClick() {
  if (!soundEnabled) return;
  const now = Date.now();
  if (now - lastClickAt < 200) return;
  lastClickAt = now;
  playSound("click");
}

const BG_MELODY = [261, 329, 392, 329, 261, 220, 261, 329];
let bgNoteIdx = 0;

export function startBackgroundMusic() {
  if (bgMusicPlaying) return;
  bgMusicPlaying = true;

  if (Platform.OS === "web") {
    bgNoteIdx = 0;
    bgInterval = setInterval(() => {
      const freq = BG_MELODY[bgNoteIdx % BG_MELODY.length];
      playTone(freq, 0.5, "sine", 0.04);
      bgNoteIdx++;
    }, 700);
  } else {
    if (bgSoundObj) {
      bgSoundObj
        .setPositionAsync(0)
        .then(() => bgSoundObj.playAsync())
        .catch(() => {});
    }
  }
}

export function stopBackgroundMusic() {
  bgMusicPlaying = false;
  if (Platform.OS === "web") {
    if (bgInterval !== null) {
      clearInterval(bgInterval);
      bgInterval = null;
    }
  } else {
    if (bgSoundObj) {
      bgSoundObj.pauseAsync().catch(() => {});
    }
  }
}
