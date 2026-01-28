import { updateUserProfileBio } from "@/features/auth/api/userProfile.service";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import {
  getContactById,
  loadContacts,
  updateContactBio,
} from "@/features/contacts/api/contacts.service";
import { getNotesByContact } from "@/features/notes/api/notes.service";
import NoteCard from "@/features/notes/components/NoteCard";
import { getRecentInteractions } from "@/features/profile/api/interactions.service";
import {
  getContactAnalytics,
  getUserAnalytics,
} from "@/features/profile/api/profileAnalytics.service";
import { InteractionCard } from "@/features/profile/components/InteractionCard";
import { KPICard } from "@/features/profile/components/KPICard";
import { KPIGrid } from "@/features/profile/components/KPIGrid";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  Flame,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const { contactId } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User mode state
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [recentInteractions, setRecentInteractions] = useState<any[]>([]);

  // Contact mode state
  const [contact, setContact] = useState<any>(null);
  const [contactAnalytics, setContactAnalytics] = useState<any>(null);
  const [contactNotes, setContactNotes] = useState<any[]>([]);

  const isContactView = !!contactId;

  const loadData = async () => {
    if (!profile) return;

    try {
      setError(null);

      if (isContactView && typeof contactId === "string") {
        // Contact mode
        const contactData = await getContactById(contactId);
        if (!contactData) {
          setError("Contact not found");
          return;
        }
        setContact(contactData);

        const analytics = await getContactAnalytics(profile.$id, contactData);
        setContactAnalytics(analytics);

        const notes = await getNotesByContact(profile.$id, contactId);
        setContactNotes(notes);
      } else {
        // User mode
        const contacts = await loadContacts(profile.$id);
        const analytics = await getUserAnalytics(profile.$id, contacts);
        setUserAnalytics(analytics);

        const interactions = await getRecentInteractions(profile.$id, 10);
        setRecentInteractions(interactions);
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
      setError("Failed to load profile data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData();
    }, [profile, contactId]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleBioEdit = async (newBio: string) => {
    if (!profile) return;

    try {
      if (isContactView && contact) {
        await updateContactBio(contact.$id, newBio);
        setContact({ ...contact, bio: newBio });
      } else {
        await updateUserProfileBio(profile.$id, newBio);
        // Update profile in parent hook would require refetch
      }
    } catch (err) {
      console.error("Failed to update bio:", err);
    }
  };

  const handleSettingsPress = () => {
    router.push("/(tabs)/settings" as any);
  };

  const handleInteractionPress = (contactId: string) => {
    router.push(`/(tabs)/contacts/details?contactId=${contactId}` as any);
  };

  const handleNotePress = (noteId: string) => {
    // Navigate to note detail if needed
    console.log("Note pressed:", noteId);
  };

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-darkBG items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-darkBG items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-400 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-darkBG items-center justify-center p-6">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Pressable
          onPress={() => {
            setIsLoading(true);
            loadData();
          }}
          className="bg-blue-600 rounded-xl px-6 py-3 active:opacity-70"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-darkBG">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="pt-4">
          {/* Header */}
          <ProfileHeader
            name={
              isContactView
                ? contact?.displayName || "Unknown"
                : profile.displayName
            }
            bio={isContactView ? contact?.bio || "" : profile.bio || ""}
            isOwnProfile={!isContactView}
            onBioEdit={handleBioEdit}
            onSettingsPress={handleSettingsPress}
          />

          {/* KPI Grid */}
          <View className="mb-6">
            {isContactView ? (
              // Contact KPIs
              <KPIGrid>
                <KPICard
                  label="RHS Score"
                  value={
                    contactAnalytics?.rhsScore
                      ? Math.round(contactAnalytics.rhsScore)
                      : 0
                  }
                  icon={<Flame size={24} color="#ef4444" />}
                />
                <KPICard
                  label="Days Since Contact"
                  value={
                    contactAnalytics?.daysSinceContact === -1
                      ? "Never"
                      : contactAnalytics?.daysSinceContact || 0
                  }
                  icon={<Clock size={24} color="#3B82F6" />}
                />
                <KPICard
                  label="Total Engagements"
                  value={contactAnalytics?.totalEngagements || 0}
                  icon={<MessageSquare size={24} color="#10B981" />}
                />
                <KPICard
                  label="Cadence Status"
                  value={contactAnalytics?.cadenceStatus || "N/A"}
                  icon={<Target size={24} color="#F59E0B" />}
                />
              </KPIGrid>
            ) : (
              // User KPIs
              <KPIGrid>
                <KPICard
                  label="Total Contacts"
                  value={userAnalytics?.totalContacts || 0}
                  icon={<Users size={24} color="#3B82F6" />}
                />
                <KPICard
                  label="Average RHS"
                  value={
                    userAnalytics?.averageRHS
                      ? Math.round(userAnalytics.averageRHS)
                      : 0
                  }
                  icon={<TrendingUp size={24} color="#10B981" />}
                />
                <KPICard
                  label="This Week"
                  value={userAnalytics?.engagementsThisWeek || 0}
                  icon={<Calendar size={24} color="#F59E0B" />}
                />
                <KPICard
                  label="High Priority"
                  value={userAnalytics?.highPriorityContacts || 0}
                  icon={<Flame size={24} color="#ef4444" />}
                />
              </KPIGrid>
            )}
          </View>

          {/* Activity Section */}
          <View>
            <Text className="text-lg font-bold text-white mb-3">
              {isContactView ? "Notes" : "Recent Touches Made"}
            </Text>

            {isContactView ? (
              // Contact notes
              contactNotes.length > 0 ? (
                contactNotes.map((note) => (
                  <NoteCard
                    key={note.$id}
                    note={note}
                    onPress={() => handleNotePress(note.$id)}
                  />
                ))
              ) : (
                <View className="bg-[#1a1a1a] rounded-xl p-6 items-center">
                  <Text className="text-gray-400 text-center">
                    No notes yet. Create your first note to track context about{" "}
                    {contact?.displayName}.
                  </Text>
                </View>
              )
            ) : // User interactions
            recentInteractions.length > 0 ? (
              recentInteractions.map((interaction) => (
                <InteractionCard
                  key={interaction.eventId}
                  interaction={interaction}
                  onPress={() => handleInteractionPress(interaction.contactId)}
                />
              ))
            ) : (
              <View className="bg-[#1a1a1a] rounded-xl p-6 items-center">
                <Text className="text-gray-400 text-center">
                  No recent interactions. Start engaging with your contacts!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
