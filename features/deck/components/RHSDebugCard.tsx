import { View, Text, ScrollView } from "react-native";
import { RHSFactors } from "../api/rhs.service";

interface RHSDebugCardProps {
  rhs: RHSFactors;
  contactName: string;
}

export default function RHSDebugCard({ rhs, contactName }: RHSDebugCardProps) {
  const getScoreColor = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.7) return "text-red-600";
    if (ratio >= 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <ScrollView className="bg-white rounded-xl p-4 border border-gray-200">
      <Text className="text-lg font-bold mb-4">{contactName}</Text>

      <View className="mb-4 p-3 bg-blue-50 rounded-lg">
        <Text className="text-sm text-gray-600 mb-1">Total RHS</Text>
        <Text
          className={`text-3xl font-bold ${getScoreColor(rhs.totalScore, 100)}`}
        >
          {rhs.totalScore}
        </Text>
      </View>

      <View className="gap-2">
        <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
          <Text className="text-sm text-gray-700">Recency Score</Text>
          <Text
            className={`font-semibold ${getScoreColor(rhs.recencyScore, 100)}`}
          >
            +{rhs.recencyScore}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
          <Text className="text-sm text-gray-700">Cadence Weight</Text>
          <Text
            className={`font-semibold ${
              rhs.cadenceWeight >= 0 ? "text-orange-600" : "text-blue-600"
            }`}
          >
            {rhs.cadenceWeight >= 0 ? "+" : ""}
            {rhs.cadenceWeight}
          </Text>
        </View>

        {rhs.freshnessBoost > 0 && (
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-700">Freshness Boost</Text>
            <Text className="font-semibold text-purple-600">
              +{rhs.freshnessBoost}
            </Text>
          </View>
        )}

        {rhs.engagementQualityBonus !== 0 && (
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-700">Engagement Quality</Text>
            <Text
              className={`font-semibold ${
                rhs.engagementQualityBonus >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {rhs.engagementQualityBonus >= 0 ? "+" : ""}
              {rhs.engagementQualityBonus}
            </Text>
          </View>
        )}

        {rhs.conversationDepthBonus > 0 && (
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-700">Conversation Depth</Text>
            <Text className="font-semibold text-blue-600">
              +{rhs.conversationDepthBonus}
            </Text>
          </View>
        )}

        {rhs.fatigueGuardPenalty > 0 && (
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-700">Fatigue Guard</Text>
            <Text className="font-semibold text-gray-600">
              -{rhs.fatigueGuardPenalty}
            </Text>
          </View>
        )}
      </View>

      <View className="mt-4 pt-4 border-t border-gray-200 gap-1">
        <Text className="text-xs text-gray-500">
          Last contact:{" "}
          {rhs.daysSinceLastEngagement
            ? `${Math.round(rhs.daysSinceLastEngagement)} days ago`
            : "Never"}
        </Text>
        <Text className="text-xs text-gray-500">
          Total engagements: {rhs.totalEngagements}
        </Text>
        <Text className="text-xs text-gray-500">
          Positive outcomes: {rhs.positiveOutcomes} | Negative:{" "}
          {rhs.negativeOutcomes}
        </Text>
        {rhs.averageEngagementFrequency > 0 && (
          <Text className="text-xs text-gray-500">
            Avg frequency: {Math.round(rhs.averageEngagementFrequency)} days
          </Text>
        )}
        {rhs.isOverdueByCadence && (
          <Text className="text-xs text-orange-600 font-medium">
            Overdue by {rhs.daysOverdue} days
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
