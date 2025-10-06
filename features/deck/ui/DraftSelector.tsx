import { View, Text } from "react-native";

export default function DraftSelector({ drafts }: { drafts: string[] }) {
  return (
    <View className="mt-4">
      <Text className="text-sm font-medium">Choose a draft:</Text>
      {drafts.map((d, i) => (
        <View
          key={i}
          className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
        >
          <Text className="text-sm text-neutral-800">{d}</Text>
        </View>
      ))}
    </View>
  );
}
