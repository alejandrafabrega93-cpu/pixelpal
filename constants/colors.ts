const defaultTheme = {
  bg: "#111820",
  bgCard: "#1A2336",
  bgCardAlt: "#1E2A40",
  bgInput: "#202D43",
  border: "#263348",
  borderLight: "#2E3D5A",

  primary: "#3DE882",
  primaryDark: "#28A958",
  primaryGlow: "rgba(61, 232, 130, 0.2)",

  accent: "#F5B042",
  accentGlow: "rgba(245, 176, 66, 0.2)",

  danger: "#F05070",
  dangerGlow: "rgba(240, 80, 112, 0.15)",

  info: "#5AA8F0",

  text: "#EEF4FF",
  textSecondary: "#8BAACF",
  textMuted: "#4A6285",

  tabBar: "#141D2C",
  tabBarBorder: "#1E2D44",
  tabActive: "#3DE882",
  tabInactive: "#4A6285",
};

const highContrastTheme = {
  bg: "#000000",
  bgCard: "#1A1A1A",
  bgCardAlt: "#2D2D2D",
  bgInput: "#333333",
  border: "#4D4D4D",
  borderLight: "#666666",

  primary: "#00FF00",
  primaryDark: "#00CC00",
  primaryGlow: "rgba(0, 255, 0, 0.4)",

  accent: "#FFFF00",
  accentGlow: "rgba(255, 255, 0, 0.3)",

  danger: "#FF0000",
  dangerGlow: "rgba(255, 0, 0, 0.3)",

  info: "#00FFFF",

  text: "#FFFFFF",
  textSecondary: "#E0E0E0",
  textMuted: "#B0B0B0",

  tabBar: "#1A1A1A",
  tabBarBorder: "#4D4D4D",
  tabActive: "#00FF00",
  tabInactive: "#808080",
};

export function getTheme(highContrastMode: boolean) {
  if (highContrastMode) return highContrastTheme;
  return defaultTheme;
}

export const Colors = defaultTheme;

export default Colors;
