import { Check, Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  loadContacts,
  ProfileContact,
} from "@/features/contacts/api/contacts.service";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile"; // Changed import

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function ContactPicker({
  visible,
  onClose,
  selectedIds,
  onSelectionChange,
}: ContactPickerProps) {
  const { profile } = useUserProfile(); // Changed from useUser
  const [contacts, setContacts] = useState<ProfileContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ProfileContact[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelection, setLocalSelection] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible && profile) {
      // Changed from user
      loadContacts(profile.clerkUserId).then((data) => {
        // Changed from user.id
        setContacts(data);
        setFilteredContacts(data);
      });
      setLocalSelection(selectedIds);
    }
  }, [visible, profile, selectedIds]); // Changed dependency

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            c.displayName.toLowerCase().includes(query) ||
            c.organization?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, contacts]);

  const toggleContact = (contactId: string) => {
    setLocalSelection((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleDone = () => {
    onSelectionChange(localSelection);
    onClose();
  };

  const getInitials = (contact: ProfileContact) => {
    return (
      `${contact.firstName?.charAt(0) || ""}${
        contact.lastName?.charAt(0) || ""
      }`.toUpperCase() || "?"
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">Link Contacts</Text>
            <TouchableOpacity onPress={handleDone}>
              <Text className="text-blue-600 font-semibold text-base">
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contacts..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-900"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected count */}
        {localSelection.length > 0 && (
          <View className="bg-blue-50 px-4 py-2">
            <Text className="text-blue-700 text-sm">
              {localSelection.length} contact
              {localSelection.length > 1 ? "s" : ""} selected
            </Text>
          </View>
        )}

        {/* Contact list */}
        <ScrollView className="flex-1">
          {filteredContacts.map((contact) => {
            const isSelected = localSelection.includes(contact.$id);
            return (
              <TouchableOpacity
                key={contact.$id}
                onPress={() => toggleContact(contact.$id)}
                className={`flex-row items-center px-4 py-3 bg-white border-b border-gray-100 ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isSelected ? "bg-blue-500" : "bg-gray-200"
                  }`}
                >
                  {isSelected ? (
                    <Check size={20} color="white" />
                  ) : (
                    <Text className="text-gray-600 font-semibold">
                      {getInitials(contact)}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {contact.displayName}
                  </Text>
                  {contact.organization && (
                    <Text className="text-sm text-gray-500">
                      {contact.organization}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
