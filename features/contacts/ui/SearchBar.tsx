import { View, TextInput } from "react-native";
export default function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View className="px-4 py-2">
      <TextInput
        className="rounded-2xl border border-neutral-300 px-4 py-3 text-base"
        placeholder="Search contacts"
        value={value}
        onChangeText={onChangeText}
        editable
      />
    </View>
  );
}
