import { Tabs } from "expo-router";
import {
  HomeIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
} from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Deck",
          tabBarIcon: ({ color }) => <HomeIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contact-list"
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
    </Tabs>
  );
}
