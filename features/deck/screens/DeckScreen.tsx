import { useState } from "react";
import { View, FlatList } from "react-native";
import DeckHeader from "../ui/DeckHeader";
import CardItem from "../ui/CardItem";
import EmptyDeck from "../ui/EmptyDeck";
import { MOCK_DECK } from "../mock/deck";
import { useCommunications } from "features/communication/hooks/useCommunications";

export default function DeckScreen() {
  const [completed] = useState<string[]>([]);
  const { startCommunication } = useCommunications();
  const data = MOCK_DECK.filter((c) => !completed.includes(c.id));

  const handleCardPress = (contactId: string) => {
    // Start the communications flow
    startCommunication(contactId);
  };

  return (
    <View className="flex-1 bg-white">
      <DeckHeader count={completed.length} total={MOCK_DECK.length} />
      {data.length === 0 ? (
        <EmptyDeck />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardItem
              card={item}
              onPress={() => handleCardPress(item.contactId)}
            />
          )}
        />
      )}
    </View>
  );
}
