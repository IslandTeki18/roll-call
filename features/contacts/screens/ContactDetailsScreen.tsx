import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { generateDraft } from "@/features/messaging/api/drafts.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  ChevronLeft,
  Edit3,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Video,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tablesDB } from "../../shared/lib/appwrite";
import { updateContactCadence } from "../api/contacts.service";
import CadenceSelector from "../components/CadenceSelector";
import { getNotesByContact } from "@/features/notes/api/notes.service";
import { Note } from "@/features/notes/types/notes.types";
import NoteCard from "@/features/notes/components/NoteCard";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const PROFILE_CONTACTS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROFILE_CONTACTS_TABLE_ID!;

interface ProfileContact {
  $id: string;
  userId: string;
  sourceType: "device" | "google" | "outlook" | "slack";
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumbers: string;
  emails: string;
  organization: string;
  jobTitle: string;
  notes: string;
  dedupeSignature: string;
  firstImportedAt: string;
  lastImportedAt: string;
  firstSeenAt: string;
}

export default function ContactDetailsScreen() {
  const { profile } = useUserProfile();
  const { isPremium, requirePremium } = usePremiumGate();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [contact, setContact] = useState<ProfileContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<string>("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showDraftEditor, setShowDraftEditor] = useState(false); // New state for showing draft editor
  const [cadenceDays, setCadenceDays] = useState<number | null>(null);
  const [savingCadence, setSavingCadence] = useState(false);
  const [contactNotes, setContactNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    loadContact();
  }, [params.id]);

  useEffect(() => {
    if (contact && profile) {
      loadContactNotes();
    }
  }, [contact, profile]);

  const loadContact = async () => {
    if (!params.id) return;

    try {
      setLoading(true);
      const response = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: PROFILE_CONTACTS_COLLECTION_ID,
        rowId: params.id as string,
      });
      setContact(response as unknown as ProfileContact);
      setCadenceDays((response as any).cadenceDays ?? null);
    } catch (error) {
      console.error("Failed to load contact:", error);
      Alert.alert("Error", "Could not load contact details");
    } finally {
      setLoading(false);
    }
  };

  const loadContactNotes = async () => {
    if (!profile || !contact) return;

    try {
      setLoadingNotes(true);
      const notes = await getNotesByContact(profile.$id, contact.$id, 10);
      setContactNotes(notes);
    } catch (error) {
      console.error("Failed to load contact notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleCadenceChange = async (newCadence: number | null) => {
    if (!contact) return;

    setSavingCadence(true);
    try {
      await updateContactCadence(contact.$id, newCadence);
      setCadenceDays(newCadence);
    } catch (error) {
      Alert.alert("Error", "Could not update cadence");
    } finally {
      setSavingCadence(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!profile || !contact) return;

    if (!isPremium) {
      requirePremium("AI Draft Generation");
      return;
    }

    setGeneratingDraft(true);
    setShowDraftEditor(false);

    try {
      const generated = await generateDraft(profile.$id, contact.$id);
      setDraft(generated);
      setShowDraftEditor(true); // Show draft editor after generation
    } catch (error) {
      Alert.alert("Error", "Could not generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendDraft = async () => {
    if (!draft.trim()) {
      Alert.alert("Error", "Cannot send empty message");
      return;
    }

    const phoneNumbers = contact?.phoneNumbers.split(",").filter(Boolean) || [];
    const primaryPhone = phoneNumbers[0];

    if (!primaryPhone) {
      Alert.alert("Error", "No phone number available for this contact");
      return;
    }

    try {
      const smsUrl = `sms:${primaryPhone}?body=${encodeURIComponent(draft)}`;

      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);

        // Reset draft state after sending
        setShowDraftEditor(false);
        setDraft("");
      } else {
        Alert.alert("Error", "Cannot open SMS app");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open SMS app");
      console.error("SMS error:", error);
    }
  };

  const handleCancelDraft = () => {
    setShowDraftEditor(false);
    setDraft("");
  };

  const handleCreateNote = () => {
    router.push({
      pathname: "/(tabs)/notes",
      params: { contactId: contact?.$id },
    });
  };

  const handleNotePress = (note: Note) => {
    router.push({
      pathname: "/(tabs)/notes",
      params: { noteId: note.$id },
    });
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSMS = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleFaceTime = (phone: string) => {
    if (Platform.OS === "ios") {
      Linking.openURL(`facetime:${phone}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${contact?.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await tablesDB.deleteRow({
                databaseId: DATABASE_ID,
                tableId: PROFILE_CONTACTS_COLLECTION_ID,
                rowId: contact!.$id,
              });
              router.back();
            } catch (error) {
              Alert.alert("Error", `Could not delete contact. Error: ${error}`);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Contact not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-blue-600 font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const phoneNumbers = contact.phoneNumbers.split(",").filter(Boolean);
  const emails = contact.emails.split(",").filter(Boolean);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity className="p-2">
              <Edit3 size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} className="p-2">
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="bg-white pt-8 pb-6 px-6 items-center border-b border-gray-200">
          <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-4">
            <Text className="text-blue-600 text-3xl font-bold">
              {contact.firstName.charAt(0).toUpperCase()}
              {contact.lastName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-3xl font-bold mb-1">{contact.displayName}</Text>
          {contact.jobTitle && (
            <Text className="text-gray-600 text-base mb-1">
              {contact.jobTitle}
            </Text>
          )}
          {contact.organization && (
            <Text className="text-gray-500 text-sm">
              {contact.organization}
            </Text>
          )}
        </View>

        <View className="bg-white mt-2 px-6 py-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Quick Actions
          </Text>
          <View className="flex-row justify-around">
            {phoneNumbers[0] && (
              <TouchableOpacity
                onPress={() => handleCall(phoneNumbers[0])}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-2">
                  <Phone size={24} color="#3B82F6" />
                </View>
                <Text className="text-xs text-gray-600">Call</Text>
              </TouchableOpacity>
            )}
            {phoneNumbers[0] && (
              <TouchableOpacity
                onPress={() => handleSMS(phoneNumbers[0])}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center mb-2">
                  <MessageSquare size={24} color="#10B981" />
                </View>
                <Text className="text-xs text-gray-600">Message</Text>
              </TouchableOpacity>
            )}
            {emails[0] && (
              <TouchableOpacity
                onPress={() => handleEmail(emails[0])}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-purple-100 items-center justify-center mb-2">
                  <Mail size={24} color="#8B5CF6" />
                </View>
                <Text className="text-xs text-gray-600">Email</Text>
              </TouchableOpacity>
            )}
            {phoneNumbers[0] && Platform.OS === "ios" && (
              <TouchableOpacity
                onPress={() => handleFaceTime(phoneNumbers[0])}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mb-2">
                  <Video size={24} color="#6366F1" />
                </View>
                <Text className="text-xs text-gray-600">FaceTime</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleGenerateDraft}
              disabled={generatingDraft}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center mb-2 relative">
                {generatingDraft ? (
                  <ActivityIndicator size="small" color="#F97316" />
                ) : isPremium ? (
                  <Sparkles size={24} color="#F97316" />
                ) : (
                  <>
                    <Edit3 size={24} color="#F97316" />
                    <View className="absolute -bottom-1 -right-1 bg-gray-200 rounded-full p-1">
                      <Lock size={10} color="#6B7280" />
                    </View>
                  </>
                )}
              </View>
              <Text className="text-xs text-gray-600">
                {generatingDraft ? "..." : "AI Draft"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Draft Editor - shown after generation */}
        {showDraftEditor && (
          <View className="bg-white mt-2 px-6 py-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#7C3AED" />
                <Text className="text-xs font-semibold text-gray-500 uppercase">
                  AI Generated Draft
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancelDraft}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              className="bg-gray-50 p-4 rounded-xl text-base text-gray-900 min-h-[120px] mb-4 border border-gray-200"
              style={{ textAlignVertical: "top" }}
              placeholder="Edit your message..."
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCancelDraft}
                className="flex-1 py-3 rounded-xl border border-gray-300 active:bg-gray-50"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendDraft}
                disabled={!draft.trim()}
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${
                  draft.trim()
                    ? "bg-blue-600 active:bg-blue-700"
                    : "bg-gray-300"
                }`}
              >
                <Send size={18} color="white" />
                <Text className="text-center font-semibold text-white">
                  Send SMS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading state for draft generation */}
        {generatingDraft && (
          <View className="bg-white mt-2 px-6 py-4">
            <View className="flex-row items-center justify-center gap-3 py-4">
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text className="text-gray-600">Generating AI draft...</Text>
            </View>
          </View>
        )}

        {/* Notes Section */}
        <View className="bg-white mt-2 px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <FileText size={18} color="#6B7280" />
              <Text className="text-xs font-semibold text-gray-500 uppercase">
                Notes
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCreateNote}
              className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
            >
              <Plus size={14} color="white" />
              <Text className="text-white text-xs font-semibold">Add Note</Text>
            </TouchableOpacity>
          </View>

          {loadingNotes ? (
            <View className="py-4">
              <Text className="text-gray-500 text-center text-sm">
                Loading notes...
              </Text>
            </View>
          ) : contactNotes.length === 0 ? (
            <View className="py-4 bg-gray-50 rounded-lg items-center">
              <Text className="text-gray-500 text-sm mb-2">
                No notes for this contact yet
              </Text>
              <TouchableOpacity onPress={handleCreateNote}>
                <Text className="text-blue-600 text-sm font-medium">
                  Create your first note
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {contactNotes.map((note) => (
                <NoteCard
                  key={note.$id}
                  note={note}
                  onPress={() => handleNotePress(note)}
                />
              ))}
              {contactNotes.length >= 10 && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/notes",
                      params: { contactId: contact.$id },
                    })
                  }
                  className="py-2"
                >
                  <Text className="text-blue-600 text-center text-sm font-medium">
                    View all notes
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {phoneNumbers.length > 0 && (
          <View className="bg-white mt-2 px-6 py-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Phone Numbers
            </Text>
            {phoneNumbers.map((phone, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCall(phone)}
                className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0"
              >
                <Phone size={20} color="#6B7280" />
                <Text className="ml-3 text-base flex-1">{phone}</Text>
                <Text className="text-sm text-gray-500">
                  {idx === 0 ? "Primary" : "Other"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {emails.length > 0 && (
          <View className="bg-white mt-2 px-6 py-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Email Addresses
            </Text>
            {emails.map((email, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleEmail(email)}
                className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0"
              >
                <Mail size={20} color="#6B7280" />
                <Text className="ml-3 text-base flex-1">{email}</Text>
                <Text className="text-sm text-gray-500">
                  {idx === 0 ? "Primary" : "Other"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {contact.notes && (
          <View className="bg-white mt-2 px-6 py-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Notes
            </Text>
            <Text className="text-base text-gray-700 leading-6">
              {contact.notes}
            </Text>
          </View>
        )}

        <View className="bg-white mt-2 px-6 py-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Details
          </Text>

          <View className="flex-row items-center py-3 border-b border-gray-100">
            <Tag size={20} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-gray-500 mb-1">Source</Text>
              <Text className="text-base capitalize">{contact.sourceType}</Text>
            </View>
          </View>

          <View className="flex-row items-center py-3 border-b border-gray-100">
            <Calendar size={20} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-gray-500 mb-1">First Seen</Text>
              <Text className="text-base">
                {new Date(contact.firstSeenAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center py-3">
            <Calendar size={20} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-gray-500 mb-1">Last Updated</Text>
              <Text className="text-base">
                {new Date(contact.lastImportedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white mt-2 px-6 py-4">
          <CadenceSelector
            value={cadenceDays}
            onChange={handleCadenceChange}
            disabled={savingCadence}
          />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
