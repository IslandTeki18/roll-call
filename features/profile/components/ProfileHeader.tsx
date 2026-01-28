import Avatar from "@/features/shared/components/Avatar";
import { Settings } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

interface ProfileHeaderProps {
  name: string;
  bio: string;
  isOwnProfile: boolean;
  onBioEdit?: (newBio: string) => void;
  onSettingsPress?: () => void;
}

export function ProfileHeader({
  name,
  bio,
  isOwnProfile,
  onBioEdit,
  onSettingsPress,
}: ProfileHeaderProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(bio);

  const handleBioSave = () => {
    if (onBioEdit) {
      onBioEdit(editedBio);
    }
    setIsEditingBio(false);
  };

  const handleBioCancel = () => {
    setEditedBio(bio);
    setIsEditingBio(false);
  };

  return (
    <View className="mb-6">
      {/* Title Row */}
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-5xl font-bold text-white tracking-wider">
          ROLLCALL
        </Text>
        {isOwnProfile && onSettingsPress && (
          <Pressable
            onPress={onSettingsPress}
            className="p-2 active:opacity-70"
          >
            <Settings size={24} color="white" />
          </Pressable>
        )}
      </View>

      {/* Profile Row */}
      <View className="flex-row items-center">
        <Avatar size={80} name={name} />
        <View className="flex-1 ml-4">
          <Text className="text-xl font-bold text-white mb-1">{name}</Text>
          <Pressable
            onPress={() => {
              if (isOwnProfile) {
                setIsEditingBio(true);
              }
            }}
            disabled={!isOwnProfile}
          >
            <Text className="text-sm text-gray-400">
              {bio || (isOwnProfile ? "Add bio" : "No bio")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bio Edit Modal */}
      <Modal
        visible={isEditingBio}
        transparent
        animationType="fade"
        onRequestClose={handleBioCancel}
      >
        <Pressable
          className="flex-1 bg-black/70 justify-center items-center p-6"
          onPress={handleBioCancel}
        >
          <Pressable
            className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-white mb-4">Edit Bio</Text>
            <TextInput
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              className="bg-[#2a2a2a] text-white rounded-xl p-3 mb-4 min-h-[100px]"
              autoFocus
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleBioCancel}
                className="flex-1 bg-gray-700 rounded-xl py-3 active:opacity-70"
              >
                <Text className="text-white text-center font-semibold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleBioSave}
                className="flex-1 bg-blue-600 rounded-xl py-3 active:opacity-70"
              >
                <Text className="text-white text-center font-semibold">
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
