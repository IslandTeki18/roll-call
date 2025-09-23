import { Stack } from "expo-router";
import React from "react";

export default function DeckLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8F9FA" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Daily Deck",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "Deck History",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Deck Settings",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
