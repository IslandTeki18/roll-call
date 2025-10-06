import { Stack } from "expo-router";

export default function ContactsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details/[id]" options={{ title: "Contact Details", headerShown: true }} />
    </Stack>
  );
}
