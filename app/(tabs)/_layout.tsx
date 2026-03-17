import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Colors } from "@/constants/colors";
import { useGame } from "@/context/GameContext";
import { t } from "@/constants/i18n";

export default function TabLayout() {
  const { gameState } = useGame();
  const lang = gameState.settings.language;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.tabBarBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.tabBar }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(lang, "myPet"),
          tabBarIcon: ({ color }) => <Feather name="heart" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t(lang, "stats"),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chart-bar" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="arcade"
        options={{
          title: t(lang, "arcade"),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="gamepad-variant" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t(lang, "shop"),
          tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: t(lang, "journal"),
          tabBarIcon: ({ color }) => <Feather name="book" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t(lang, "settings"),
          tabBarIcon: ({ color }) => <Feather name="settings" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
