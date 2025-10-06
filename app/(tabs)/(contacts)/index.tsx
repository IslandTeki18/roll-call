import ContactsScreen from "../../../features/contacts/screens/ContactsScreen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ContactsIndex() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ContactsScreen />
    </SafeAreaView>
  );
}
