import React from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Search, X } from "lucide-react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  iconSize?: number;
  className?: string;
  inputClassName?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  iconSize = 20,
  className = "",
  inputClassName = "",
}: SearchBarProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChangeText("");
    }
  };

  const iconColor = "#6B7280";

  return (
    <View
      className={`flex-row items-center bg-[#7676801F] rounded-full px-4 py-3 ${className}`}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconColor}
        className={`flex-1 ml-2 text-white text-base ${inputClassName}`}
        accessibilityLabel={placeholder}
      />
      {value && (
        <TouchableOpacity
          onPress={handleClear}
          accessibilityLabel="Clear search"
        >
          <X size={iconSize} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}
