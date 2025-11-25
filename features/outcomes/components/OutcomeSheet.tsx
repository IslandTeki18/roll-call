import { useUser } from "@clerk/clerk-expo";
import { Frown, Meh, Smile, Sparkles, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { processOutcomeWithProgress } from "../../../services/aiProcessing.service";
import {
  createOutcomeNote,
  OutcomeSentiment,
} from "../../../services/outcomeNotes.service";

interface OutcomeSheetProps {
  visible: boolean;
  onClose: () => void;
  contactIds: string[];
  contactNames: string[]; // Display names for context
  linkedCardId?: string;
  linkedEngagementEventId?: string;
  engagementType?: string; // "sms_sent", "call_made", etc.
  onComplete?: () => void;
}

export default function OutcomeSheet({
  visible,
  onClose,
  contactIds,
  contactNames,
  linkedCardId,
  linkedEngagementEventId,
  engagementType,
  onComplete,
}: OutcomeSheetProps) {
  const { user } = useUser();
  const [sentiment, setSentiment] = useState<OutcomeSentiment | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxChars = 140;
  const remainingChars = maxChars - noteText.length;

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!visible) {
      setSentiment(null);
      setNoteText("");
      setError(null);
      setSaving(false);
      setProcessing(false);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!user || !sentiment) {
      setError("Please select a sentiment");
      return;
    }

    if (noteText.trim().length === 0) {
      setError("Please add a note");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create outcome note
      const outcome = await createOutcomeNote({
        userId: user.id,
        rawText: noteText.trim(),
        userSentiment: sentiment,
        contactIds,
        linkedCardId,
        linkedEngagementEventId,
      });

      // Process with AI in background with progress tracking
      setProcessing(true);
      await processOutcomeWithProgress(outcome.$id, (status) => {
        if (status === "completed" || status === "failed") {
          setProcessing(false);
        }
      });

      // Success
      onComplete?.();
      onClose();
    } catch (err) {
      console.error("Failed to save outcome:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save outcome note"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const sentimentOptions: {
    value: OutcomeSentiment;
    icon: typeof Smile;
    label: string;
    color: string;
    bgColor: string;
  }[] = [
    {
      value: "positive",
      icon: Smile,
      label: "Positive",
      color: "#10B981",
      bgColor: "#D1FAE5",
    },
    {
      value: "neutral",
      icon: Meh,
      label: "Neutral",
      color: "#6B7280",
      bgColor: "#F3F4F6",
    },
    {
      value: "negative",
      icon: Frown,
      label: "Negative",
      color: "#EF4444",
      bgColor: "#FEE2E2",
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={onClose}
          />

          {/* Drawer */}
          <View className="bg-white rounded-t-3xl shadow-2xl">
            <ScrollView
              className="max-h-[85vh]"
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <View className="flex-1">
                  <Text className="text-xl font-bold mb-1">How did it go?</Text>
                  <Text className="text-sm text-gray-600">
                    {engagementType
                      ? `${engagementType.replace("_", " ")} with `
                      : ""}
                    {contactNames.join(", ")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-2 -mr-2"
                  disabled={saving || processing}
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View className="px-6 py-6">
                {/* Sentiment Selection */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Overall feeling
                  </Text>
                  <View className="flex-row gap-3">
                    {sentimentOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = sentiment === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setSentiment(option.value)}
                          disabled={saving || processing}
                          className={`flex-1 items-center py-4 rounded-xl border-2 ${
                            isSelected
                              ? `border-[${option.color}]`
                              : "border-gray-200"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? option.bgColor
                              : "white",
                          }}
                        >
                          <Icon
                            size={28}
                            color={isSelected ? option.color : "#9CA3AF"}
                          />
                          <Text
                            className={`text-xs font-medium mt-2 ${
                              isSelected ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Note Input */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-semibold text-gray-700">
                      Quick reflection
                    </Text>
                    <Text
                      className={`text-xs font-medium ${
                        remainingChars < 20
                          ? "text-red-500"
                          : remainingChars < 40
                          ? "text-yellow-600"
                          : "text-gray-500"
                      }`}
                    >
                      {remainingChars} / {maxChars}
                    </Text>
                  </View>
                  <TextInput
                    value={noteText}
                    onChangeText={(text) => {
                      if (text.length <= maxChars) {
                        setNoteText(text);
                        setError(null);
                      }
                    }}
                    placeholder="What happened? Any commitments or next steps?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={maxChars}
                    editable={!saving && !processing}
                    className="bg-gray-50 px-4 py-4 rounded-xl text-base min-h-[120px] text-gray-900"
                    style={{ textAlignVertical: "top" }}
                  />
                </View>

                {/* AI Processing Info */}
                {processing && (
                  <View className="flex-row items-center gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                    <Sparkles size={16} color="#3B82F6" />
                    <Text className="text-sm text-blue-700 flex-1">
                      AI is analyzing your note...
                    </Text>
                    <ActivityIndicator size="small" color="#3B82F6" />
                  </View>
                )}

                {/* Error Message */}
                {error && (
                  <View className="p-3 bg-red-50 rounded-lg mb-4">
                    <Text className="text-sm text-red-700">{error}</Text>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleSkip}
                    disabled={saving || processing}
                    className="flex-1 py-4 rounded-xl border border-gray-300 active:bg-gray-50"
                  >
                    <Text className="text-center font-semibold text-gray-700">
                      Skip
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={
                      !sentiment ||
                      noteText.trim().length === 0 ||
                      saving ||
                      processing
                    }
                    className={`flex-1 py-4 rounded-xl ${
                      !sentiment ||
                      noteText.trim().length === 0 ||
                      saving ||
                      processing
                        ? "bg-gray-300"
                        : "bg-blue-600 active:bg-blue-700"
                    }`}
                  >
                    {saving || processing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-center font-semibold text-white">
                        Save & Analyze
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* AI Context */}
                <View className="mt-4 flex-row items-start gap-2">
                  <Sparkles size={14} color="#9CA3AF" className="mt-0.5" />
                  <Text className="text-xs text-gray-500 flex-1">
                    Your note will be analyzed by AI to extract summaries, next
                    steps, and key entities automatically.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
