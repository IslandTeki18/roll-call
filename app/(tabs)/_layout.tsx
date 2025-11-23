import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useUserProfile } from "../../hooks/useUserProfile";
import { View, Text } from "react-native";
import {
  HomeIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
} from "lucide-react-native";

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  const { profile, loading, error } = useUserProfile();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-600">Failed to load profile</Text>
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Deck",
          tabBarIcon: ({ color }) => <HomeIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color }) => <UsersIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) => <FileTextIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => <BarChart3Icon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contact-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
