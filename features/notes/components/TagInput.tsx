import { Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = "Add tag...",
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <View>
      {/* Current tags */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          <View className="flex-row gap-2">
            {tags.map((tag) => (
              <View
                key={tag}
                className="flex-row items-center bg-blue-100 px-3 py-1.5 rounded-full"
              >
                <Text className="text-blue-700 text-sm font-medium mr-1">
                  #{tag}
                </Text>
                {!disabled && (
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <X size={14} color="#1D4ED8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Input */}
      {!disabled && (
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <TextInput
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setShowSuggestions(text.length > 0);
            }}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-base text-gray-900"
            returnKeyType="done"
            autoCapitalize="none"
          />
          {inputValue.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-blue-600 p-1.5 rounded-full ml-2"
            >
              <Plus size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View className="bg-white border border-gray-200 rounded-xl mt-2 overflow-hidden">
          {filteredSuggestions.slice(0, 5).map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              onPress={() => addTag(suggestion)}
              className="px-4 py-3 border-b border-gray-100 last:border-b-0"
            >
              <Text className="text-gray-700">#{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
