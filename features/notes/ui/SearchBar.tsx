import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  variant?: "default" | "minimal";
  showCancel?: boolean;
  onCancel?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  placeholder = "Search notes...",
  autoFocus = false,
  variant = "default",
  showCancel = false,
  onCancel,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  const handleCancel = () => {
    onChangeText("");
    onCancel?.();
  };

  if (variant === "minimal") {
    return (
      <View className="flex-row items-center gap-2">
        <View
          className={`
            flex-1 flex-row items-center gap-2 px-3 py-2 rounded-lg border
            ${isFocused ? "border-indigo-500 bg-white" : "border-gray-200 bg-gray-50"}
          `}
        >
          <Text className="text-base">🔍</Text>
          <TextInput
            className="flex-1 text-base text-gray-900"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text className="text-base text-gray-400 font-bold">×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Default variant with more features
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <View
          className={`
            flex-1 flex-row items-center gap-3 px-4 py-3 rounded-xl border-2
            ${isFocused ? "border-indigo-500 bg-white shadow-sm" : "border-gray-200 bg-gray-50"}
          `}
        >
          {/* Search icon */}
          <Text
            className={`text-lg ${isFocused ? "opacity-100" : "opacity-50"}`}
          >
            🔍
          </Text>

          {/* Input */}
          <TextInput
            className="flex-1 text-base text-gray-900"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {/* Clear button */}
          {value.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              className="bg-gray-200 rounded-full w-5 h-5 items-center justify-center"
            >
              <Text className="text-sm text-gray-600 font-bold">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel button (iOS style) */}
        {showCancel && (isFocused || value.length > 0) && (
          <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
            <Text className="text-base text-indigo-600 font-semibold">
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search hints when focused and empty */}
      {isFocused && value.length === 0 && (
        <View className="px-2">
          <Text className="text-xs text-gray-500">
            💡 Search by keywords, tags, or contact names
          </Text>
        </View>
      )}

      {/* Result count when searching */}
      {value.length > 0 && (
        <View className="px-2 flex-row items-center gap-1.5">
          <View className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
          <Text className="text-xs text-gray-600 font-medium">
            Searching for "{value}"
          </Text>
        </View>
      )}
    </View>
  );
};
