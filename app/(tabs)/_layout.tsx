import { Tabs } from 'expo-router';
import { HomeIcon } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <HomeIcon size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
