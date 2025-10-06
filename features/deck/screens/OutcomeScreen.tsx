import { useLocalSearchParams } from "expo-router";
import { ScrollView, View, Text, Pressable } from "react-native";
import { MessageSquare } from "lucide-react-native";
import { MOCK_DECK } from "../mock/deck";
import OutcomeSheet from "../ui/OutcomeSheet";
import { useCommunications } from "features/communication/hooks/useCommunications";

export default function OutcomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startCommunication } = useCommunications();
  const card = MOCK_DECK.find((c) => c.id === id);

  if (!card) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Card not found</Text>
      </View>
    );
  }

  const handleStartCommunication = () => {
    startCommunication(card.contactId);
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold">{card.contactName}</Text>

      {/* Touch Button - Opens Communications Flow */}
      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-700 mb-3">
          Ready to reach out?
        </Text>
        <Pressable
          onPress={handleStartCommunication}
          className="bg-blue-500 rounded-xl py-4 px-6 flex-row items-center justify-center active:bg-blue-600"
        >
          <MessageSquare size={20} color="#FFFFFF" strokeWidth={2} />
          <Text className="text-white font-semibold ml-2 text-base">
            Touch {card.contactName.split(" ")[0]}
          </Text>
        </Pressable>
      </View>

      {/* Draft Preview (Optional - can be removed) */}
      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-700 mb-3">
          Suggested messages:
        </Text>
        {card.drafts.map((draft, i) => (
          <View
            key={i}
            className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <Text className="text-sm text-gray-800">{draft}</Text>
          </View>
        ))}
      </View>

      {/* Outcome Sheet - Will be shown after send in Communications flow */}
      <OutcomeSheet />
    </ScrollView>
  );
}
