import { Text, View, TouchableOpacity } from "react-native";
import { Phone, Mail, Building } from "lucide-react-native";
import { ProfileContact } from "../api/contacts.service";

interface ContactCardProps {
  contact: ProfileContact;
  onPress?: () => void;
}

export default function ContactCard({ contact, onPress }: ContactCardProps) {
  const primaryPhone = contact.phoneNumbers?.split(",")[0];
  const primaryEmail = contact.emails?.split(",")[0];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="p-4 bg-gray-900 rounded-xl border border-gray-700 active:bg-gray-800"
    >
      <Text className="font-semibold text-lg mb-2 text-white">{contact.displayName}</Text>

      {contact.organization && (
        <View className="flex-row items-center gap-2 mb-1">
          <Building size={16} color="#9CA3AF" />
          <Text className="text-gray-400 text-sm">{contact.organization}</Text>
        </View>
      )}

      {primaryPhone && (
        <View className="flex-row items-center gap-2 mb-1">
          <Phone size={16} color="#9CA3AF" />
          <Text className="text-gray-400 text-sm">{primaryPhone}</Text>
        </View>
      )}

      {primaryEmail && (
        <View className="flex-row items-center gap-2">
          <Mail size={16} color="#9CA3AF" />
          <Text className="text-gray-400 text-sm">{primaryEmail}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
