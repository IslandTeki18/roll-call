import ContactDetailScreen from "../../../../features/contacts/screens/ContactDetailScreen";
import { SafeAreaView } from "react-native-safe-area-context";


export default function ContactDetail() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ContactDetailScreen />
    </SafeAreaView>
  );
}
