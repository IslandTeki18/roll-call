import { View, TextInput, Pressable, Text } from "react-native";
import { useState, useRef } from "react";

export default function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText("");
    // Keep focus on input after clearing
    inputRef.current?.focus();
  };

  return (
    <View className="px-4 py-2">
      <View
        className={`flex-row items-center rounded-2xl border px-4 ${
          isFocused
            ? "border-neutral-900 bg-white"
            : "border-neutral-200 bg-neutral-50"
        }`}
        style={{ height: 48 }}
      >
        {/* Search Icon */}
        <Text className="mr-2 text-lg text-neutral-400">🔍</Text>

        {/* Input */}
        <TextInput
          ref={inputRef}
          className="flex-1 text-base text-neutral-900"
          style={{
            paddingVertical: 0,
            paddingTop: 0,
            paddingBottom: 0,
            height: 48,
            textAlignVertical: "center",
          }}
          placeholder="Search contacts"
          placeholderTextColor="#a3a3a3"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-neutral-300 active:bg-neutral-400"
            hitSlop={8}
          >
            <Text className="text-xs text-neutral-600">✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
