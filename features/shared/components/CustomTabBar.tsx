import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { Home, FileText } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  // Determine current active route
  const currentRoute = state.routes[state.index].name;
  const isHomeActive = currentRoute === 'index';
  const isNotesActive = currentRoute === 'notes';
  const isSettingsActive = currentRoute === 'settings';

  // Navigation handlers
  const navigateToHome = () => {
    if (!isHomeActive) {
      navigation.navigate('index');
    }
  };

  const navigateToNotes = () => {
    if (!isNotesActive) {
      navigation.navigate('notes');
    }
  };

  const navigateToSettings = () => {
    if (!isSettingsActive) {
      navigation.navigate('settings');
    }
  };

  // Avatar rendering logic
  const avatarUrl = user?.imageUrl;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <View
      style={{ paddingBottom: insets.bottom || 8 }}
      className="absolute bottom-0 left-0 right-0 px-6 pb-4"
    >
      <View className="flex-row items-center justify-between">
        {/* Home/Notes toggle pill */}
        <View className="bg-gray-900 rounded-full flex-row items-center px-3 py-3 shadow-lg">
          {/* Home button */}
          <TouchableOpacity
            onPress={navigateToHome}
            activeOpacity={0.7}
            accessibilityLabel="Navigate to Home"
            accessibilityRole="button"
            className={`px-8 py-4 rounded-full ${
              isHomeActive ? 'bg-blue-600' : 'bg-transparent'
            }`}
          >
            <Home
              size={28}
              color={isHomeActive ? '#ffffff' : '#9ca3af'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          {/* Notes button */}
          <TouchableOpacity
            onPress={navigateToNotes}
            activeOpacity={0.7}
            accessibilityLabel="Navigate to Notes"
            accessibilityRole="button"
            className={`px-8 py-4 rounded-full ${
              isNotesActive ? 'bg-blue-600' : 'bg-transparent'
            }`}
          >
            <FileText
              size={28}
              color={isNotesActive ? '#ffffff' : '#9ca3af'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Avatar button - separate from toggle */}
        <TouchableOpacity
          onPress={navigateToSettings}
          activeOpacity={0.7}
          accessibilityLabel="Open Profile Settings"
          accessibilityRole="button"
          className={`rounded-full border-2 shadow-lg ${
            isSettingsActive ? 'border-blue-600' : 'border-gray-700'
          }`}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-14 h-14 rounded-full"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center">
              <Text className="text-white font-semibold text-lg">
                {initials || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
