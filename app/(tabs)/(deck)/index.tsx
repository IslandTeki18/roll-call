import DeckScreen from "../../../features/deck/screens/DeckScreen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeckIndex() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <DeckScreen />
    </SafeAreaView>
  );
}
