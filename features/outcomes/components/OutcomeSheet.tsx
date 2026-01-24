import { Frown, Lock, Meh, Smile, Sparkles, X } from "lucide-react-native";
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
import { usePremiumGate } from "../../auth/hooks/usePremiumGate";
import { useUserProfile } from "../../auth/hooks/useUserProfile"; // Changed import
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import type { ActionId } from "@/features/deck/types/contactScore.types";
import { processOutcomeWithProgress } from "../api/aiProcessing.service";

import {
  createOutcomeNote,
  OutcomeSentiment,
} from "../api/outcomeNotes.service";

interface OutcomeSheetProps {
  visible: boolean;
  onClose: () => void;
  contactIds: string[];
  contactNames: string[];
  linkedCardId?: string;
  linkedEngagementEventId?: string;
  engagementType?: string;
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
  const { profile } = useUserProfile(); // Changed from useUser
  const { isPremium, requirePremium } = usePremiumGate();
  const [sentiment, setSentiment] = useState<OutcomeSentiment | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxChars = 140;
  const remainingChars = maxChars - noteText.length;

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
    if (!profile || !sentiment) {
      // Changed from user
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

      const outcome = await createOutcomeNote({
        userId: profile.$id,
        rawText: noteText.trim(),
        userSentiment: sentiment,
        contactIds,
        linkedCardId,
        linkedEngagementEventId,
      });

      // C6-C10: Emit outcome events based on engagement type and sentiment
      // Map engagement type to outcome action
      // TODO: In future, add explicit outcome type selection in UI (sent/vm/scheduled/replied/no_answer)
      let outcomeActionId: ActionId = 'outcome_sent';

      // Infer outcome from engagement type and sentiment
      if (engagementType === 'call_made' || engagementType === 'facetime_made') {
        if (sentiment === 'positive') {
          outcomeActionId = 'outcome_replied'; // Call connected
        } else if (sentiment === 'neutral') {
          outcomeActionId = 'outcome_vm'; // Left voicemail
        } else {
          outcomeActionId = 'outcome_no_answer'; // No answer
        }
      } else if (engagementType === 'sms_sent' || engagementType === 'email_sent') {
        if (sentiment === 'positive') {
          outcomeActionId = 'outcome_replied'; // Got reply
        } else {
          outcomeActionId = 'outcome_sent'; // Message sent, no reply yet
        }
      }

      // Emit outcome event for each contact
      contactIds.forEach((contactId) => {
        emitEvent({
          userId: profile.$id,
          contactId,
          actionId: outcomeActionId,
          linkedCardId,
          metadata: {
            sentiment,
            outcomeText: noteText.trim(),
            engagementType,
            linkedEngagementEventId,
          },
        });
      });

      if (isPremium) {
        setProcessing(true);
        await processOutcomeWithProgress(outcome.$id, (status) => {
          if (status === "completed" || status === "failed") {
            setProcessing(false);
          }
        });
      }

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
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={onClose}
          />

          <View className="bg-gray-900 rounded-t-3xl shadow-2xl">
            <ScrollView
              className="max-h-[85vh]"
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700">
                <View className="flex-1">
                  <Text className="text-xl font-bold mb-1 text-white">How did it go?</Text>
                  <Text className="text-sm text-gray-400">
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
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View className="px-6 py-6">
                {/* Sentiment Selection */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-300 mb-3">
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
                              : "border-gray-700"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? option.bgColor
                              : "#1F2937",
                          }}
                        >
                          <Icon
                            size={28}
                            color={isSelected ? option.color : "#6B7280"}
                          />
                          <Text
                            className={`text-xs font-medium mt-2 ${
                              isSelected ? "text-gray-900" : "text-gray-400"
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
                    <Text className="text-sm font-semibold text-gray-300">
                      Quick reflection
                    </Text>
                    <Text
                      className={`text-xs font-medium ${
                        remainingChars < 20
                          ? "text-red-400"
                          : remainingChars < 40
                          ? "text-yellow-500"
                          : "text-gray-400"
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
                    placeholderTextColor="#6B7280"
                    multiline
                    maxLength={maxChars}
                    editable={!saving && !processing}
                    className="bg-gray-800 px-4 py-4 rounded-xl text-base min-h-[120px] text-white border border-gray-700"
                    style={{ textAlignVertical: "top" }}
                  />
                </View>

                {/* AI Processing Info - Premium only */}
                {isPremium && processing && (
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
                    className="flex-1 py-4 rounded-xl border border-gray-700 active:bg-gray-800"
                  >
                    <Text className="text-center font-semibold text-gray-300">
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
                        {isPremium ? "Save & Analyze" : "Save"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* AI Context - Premium indicator */}
                <View className="mt-4 flex-row items-start gap-2">
                  {isPremium ? (
                    <>
                      <Sparkles size={14} color="#7C3AED" className="mt-0.5" />
                      <Text className="text-xs text-purple-600 flex-1">
                        Your note will be analyzed by AI to extract summaries,
                        next steps, and key entities automatically.
                      </Text>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => requirePremium("AI note analysis")}
                      className="flex-1 flex-row items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <Lock size={14} color="#9CA3AF" />
                      <Text className="text-xs text-gray-500 flex-1">
                        Upgrade to Premium for AI-powered note analysis
                      </Text>
                      <Sparkles size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
