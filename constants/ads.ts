import { Platform } from "react-native";

export const IAP_SKUS = {
  REMOVE_ADS: "remove_ads",
  GLOWBITS_SMALL: "glowbits_small",
  GLOWBITS_MEDIUM: "glowbits_medium",
  GLOWBITS_LARGE: "glowbits_large",
} as const;

export const IAP_PACKS_CONFIG = [
  { sku: IAP_SKUS.GLOWBITS_SMALL, amount: 500, price: "$0.99", emoji: "🪙", labelKey: "packSmall" as const },
  { sku: IAP_SKUS.GLOWBITS_MEDIUM, amount: 1500, price: "$2.49", emoji: "💰", labelKey: "packMedium" as const },
  { sku: IAP_SKUS.GLOWBITS_LARGE, amount: 5000, price: "$6.99", emoji: "💎", labelKey: "packLarge" as const },
];

export const ADMOB_APP_ID_ANDROID =
  "ca-app-pub-5915253381314202~6795466146";

export const BANNER_AD_UNIT_ID =
  "ca-app-pub-5915253381314202/7198790827";

export const INTERSTITIAL_AD_UNIT_ID =
  "ca-app-pub-5915253381314202/4667996259";

export const INTERSTITIAL_INTERVAL_MS = 5 * 60 * 1000;
