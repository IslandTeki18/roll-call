import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import {
  loadContacts,
  ProfileContact,
} from "@/features/contacts/api/contacts.service";
import { useDeck } from "@/features/deck/hooks/useDeck";
import {
  EngagementEvent,
  getRecentEvents,
} from "@/features/messaging/api/engagement.service";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { router } from "expo-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { profile } = useUserProfile();
  const { deck, loading: deckLoading } = useDeck();
  const { notes, loading: notesLoading } = useNotes();
  const [contacts, setContacts] = useState<ProfileContact[]>([]);
  const [recentEngagements, setRecentEngagements] = useState<EngagementEvent[]>(
    []
  );
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    try {
      setStatsLoading(true);
      const [contactsData, engagementsData] = await Promise.all([
        loadContacts(profile.$id),
        getRecentEvents(profile.$id, 10),
      ]);
      setContacts(contactsData);
      setRecentEngagements(engagementsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const todayEngagements = recentEngagements.filter((event) => {
    const eventDate = new Date(event.timestamp).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  }).length;

  const weekEngagements = recentEngagements.filter((event) => {
    const eventDate = new Date(event.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return eventDate >= weekAgo;
  }).length;

  const pendingCards =
    deck?.cards.filter((c) => c.status === "pending" || c.status === "active")
      .length || 0;
  const completedCards =
    deck?.cards.filter((c) => c.status === "completed").length || 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold mb-1">
              Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}
            </Text>
            <Text className="text-gray-600">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          {/* Quick Stats Grid */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-3">
              Today&apos;s Overview
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon={<Flame size={20} color="#EF4444" />}
                label="Today"
                value={todayEngagements.toString()}
                subtitle="engagements"
                color="bg-red-50"
              />
              <StatCard
                icon={<Calendar size={20} color="#3B82F6" />}
                label="Deck"
                value={`${pendingCards}/${deck?.maxCards || 0}`}
                subtitle="pending"
                color="bg-blue-50"
              />
              <StatCard
                icon={<Users size={20} color="#10B981" />}
                label="Contacts"
                value={contacts.length.toString()}
                subtitle="total"
                color="bg-green-50"
              />
              <StatCard
                icon={<FileText size={20} color="#F59E0B" />}
                label="Notes"
                value={notes.length.toString()}
                subtitle="saved"
                color="bg-amber-50"
              />
            </View>
          </View>

          {/* Daily Deck Preview */}
          <SectionCard
            title="Today's Deck"
            icon={<Calendar size={20} color="#3B82F6" />}
            onViewAll={() => router.push("/deck")}
            loading={deckLoading}
          >
            {deck && deck.cards.length > 0 ? (
              <View>
                <View className="flex-row justify-between mb-3">
                  <Text className="text-sm text-gray-600">
                    {pendingCards} pending • {completedCards} completed
                  </Text>
                  <Text className="text-sm font-medium text-blue-600">
                    {Math.round((completedCards / deck.maxCards) * 100)}% done
                  </Text>
                </View>
                <View className="bg-gray-100 rounded-full h-2 mb-3">
                  <View
                    className="bg-blue-500 rounded-full h-2"
                    style={{
                      width: `${(completedCards / deck.maxCards) * 100}%`,
                    }}
                  />
                </View>
                {deck.cards.slice(0, 3).map((card) => (
                  <TouchableOpacity
                    key={card.$id}
                    className="flex-row items-center justify-between py-2 border-b border-gray-100"
                    onPress={() => router.push("/deck")}
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      {card.status === "completed" ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : (
                        <Clock size={16} color="#6B7280" />
                      )}
                      <Text className="font-medium flex-1" numberOfLines={1}>
                        {card.contact?.displayName || "Unknown"}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {card.suggestedChannel || "message"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <EmptyState
                message="No cards for today"
                subtitle="Check back tomorrow or add more contacts"
              />
            )}
          </SectionCard>

          {/* Recent Contacts */}
          <SectionCard
            title="Recent Contacts"
            icon={<Users size={20} color="#10B981" />}
            onViewAll={() => router.push("/contacts")}
            loading={statsLoading}
          >
            {contacts.length > 0 ? (
              <View>
                {contacts
                  .sort(
                    (a, b) =>
                      new Date(b.firstSeenAt).getTime() -
                      new Date(a.firstSeenAt).getTime()
                  )
                  .slice(0, 5)
                  .map((contact) => (
                    <TouchableOpacity
                      key={contact.$id}
                      className="flex-row items-center justify-between py-3 border-b border-gray-100"
                      onPress={() =>
                        router.push({
                          pathname: "/contacts/details",
                          params: { contactId: contact.$id },
                        })
                      }
                    >
                      <View className="flex-1">
                        <Text className="font-medium mb-1">
                          {contact.displayName}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {contact.organization ||
                            contact.phoneNumbers?.split(",")[0] ||
                            "No details"}
                        </Text>
                      </View>
                      <ArrowRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
              </View>
            ) : (
              <EmptyState
                message="No contacts yet"
                subtitle="Import contacts to get started"
              />
            )}
          </SectionCard>

          {/* Recent Notes */}
          <SectionCard
            title="Recent Notes"
            icon={<FileText size={20} color="#F59E0B" />}
            onViewAll={() => router.push("/notes")}
            loading={notesLoading}
          >
            {notes.length > 0 ? (
              <View>
                {notes.slice(0, 3).map((note) => (
                  <TouchableOpacity
                    key={note.$id}
                    className="py-3 border-b border-gray-100"
                    onPress={() => router.push("/notes")}
                  >
                    {/* <Text className="font-medium mb-1" numberOfLines={1}>
                      {note.title || "Untitled Note"}
                    </Text> */}
                    <Text
                      className="text-sm text-gray-500 mb-1"
                      numberOfLines={2}
                    >
                      {note.rawText}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(note.$createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <EmptyState
                message="No notes yet"
                subtitle="Create your first note"
              />
            )}
          </SectionCard>

          {/* Activity Summary */}
          <SectionCard
            title="This Week"
            icon={<TrendingUp size={20} color="#8B5CF6" />}
            loading={statsLoading}
          >
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">Total Engagements</Text>
                <Text className="text-2xl font-bold text-purple-600">
                  {weekEngagements}
                </Text>
              </View>
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">Daily Average</Text>
                <Text className="text-2xl font-bold text-purple-600">
                  {Math.round(weekEngagements / 7)}
                </Text>
              </View>
              {profile?.isPremiumUser && (
                <TouchableOpacity
                  className="mt-2 bg-purple-50 rounded-lg p-3 flex-row items-center justify-between"
                  onPress={() => router.push("/reports")}
                >
                  <Text className="text-purple-700 font-medium">
                    View Full Reports
                  </Text>
                  <ArrowRight size={16} color="#7C3AED" />
                </TouchableOpacity>
              )}
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}

function StatCard({ icon, label, value, subtitle, color }: StatCardProps) {
  return (
    <View className={`${color} rounded-xl p-4 flex-1 min-w-[150px]`}>
      <View className="flex-row items-center gap-2 mb-2">
        {icon}
        <Text className="text-sm font-medium text-gray-600">{label}</Text>
      </View>
      <Text className="text-2xl font-bold mb-1">{value}</Text>
      <Text className="text-xs text-gray-500">{subtitle}</Text>
    </View>
  );
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  onViewAll?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

function SectionCard({
  title,
  icon,
  onViewAll,
  loading,
  children,
}: SectionCardProps) {
  return (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className="text-lg font-semibold">{title}</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text className="text-blue-600 font-medium">View All</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : (
        children
      )}
    </View>
  );
}

interface EmptyStateProps {
  message: string;
  subtitle: string;
}

function EmptyState({ message, subtitle }: EmptyStateProps) {
  return (
    <View className="py-8 items-center">
      <Text className="text-gray-400 font-medium mb-1">{message}</Text>
      <Text className="text-sm text-gray-400">{subtitle}</Text>
    </View>
  );
}
