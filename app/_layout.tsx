import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(communications)/compose"
        options={{ title: "Compose Message", headerShown: true }}
      />
      <Stack.Screen
        name="(communications)/channel-picker"
        options={{ title: "Select Channel", headerShown: true }}
      />
      <Stack.Screen
        name="(communications)/outcome"
        options={{ title: "Message Sent" }}
      />
    </Stack>
  );
}