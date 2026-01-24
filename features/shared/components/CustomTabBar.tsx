import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { Home, FileText } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';

export function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const router = useRouter();
  const segments = useSegments();

  // Determine active route from segments
  const currentRoute = segments[1] || 'index';
  const isHomeActive = currentRoute === 'index';
  const isNotesActive = currentRoute === 'notes';
  const isSettingsActive = currentRoute === 'settings';

  // Navigation handlers
  const navigateToHome = () => {
    if (!isHomeActive) {
      router.replace('/(tabs)');
    }
  };

  const navigateToNotes = () => {
    if (!isNotesActive) {
      router.replace('/(tabs)/notes');
    }
  };

  const navigateToSettings = () => {
    if (!isSettingsActive) {
      router.replace('/(tabs)/settings');
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
      <View className="flex-row items-center gap-4">
        {/* Home/Notes toggle pill */}
        <View className="flex-1 bg-gray-900 rounded-full flex-row items-center px-3 py-2 shadow-lg">
          {/* Home button */}
          <TouchableOpacity
            onPress={navigateToHome}
            activeOpacity={0.7}
            accessibilityLabel="Navigate to Home"
            accessibilityRole="button"
            className={`flex-1 py-3 rounded-full items-center ${
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
            className={`flex-1 py-3 rounded-full items-center ${
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
