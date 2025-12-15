import { Text, View, TouchableOpacity } from "react-native";
import { Phone, Mail, Building, Sparkles } from "lucide-react-native";
import { isContactNew, ProfileContact } from "../api/contacts.service";

interface ContactCardProps {
  contact: ProfileContact;
  onPress?: () => void;
}

export default function ContactCard({ contact, onPress }: ContactCardProps) {
  const primaryPhone = contact.phoneNumbers?.split(",")[0];
  const primaryEmail = contact.emails?.split(",")[0];

  // NEW: Check if contact should show NEW pill
  const showNewPill = isContactNew(contact);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm active:bg-gray-50"
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="font-semibold text-lg flex-1">
          {contact.displayName}
        </Text>
        {/* NEW: Show pill for new contacts */}
        {showNewPill && (
          <View className="bg-purple-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
            <Sparkles size={10} color="#7C3AED" />
            <Text className="text-purple-700 text-xs font-semibold">NEW</Text>
          </View>
        )}
      </View>

      {contact.organization && (
        <View className="flex-row items-center gap-2 mb-1">
          <Building size={16} color="#6B7280" />
          <Text className="text-gray-600 text-sm">{contact.organization}</Text>
        </View>
      )}

      {primaryPhone && (
        <View className="flex-row items-center gap-2 mb-1">
          <Phone size={16} color="#6B7280" />
          <Text className="text-gray-600 text-sm">{primaryPhone}</Text>
        </View>
      )}

      {primaryEmail && (
        <View className="flex-row items-center gap-2">
          <Mail size={16} color="#6B7280" />
          <Text className="text-gray-600 text-sm">{primaryEmail}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
