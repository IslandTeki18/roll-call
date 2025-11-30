import { Clock } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface CadenceSelectorProps {
  value: number | null;
  onChange: (cadenceDays: number | null) => void;
  disabled?: boolean;
}

const CADENCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "None", value: null },
  { label: "Weekly", value: 7 },
  { label: "Bi-weekly", value: 14 },
  { label: "Monthly", value: 30 },
  { label: "Quarterly", value: 90 },
];

export default function CadenceSelector({
  value,
  onChange,
  disabled = false,
}: CadenceSelectorProps) {
  return (
    <View>
      <View className="flex-row items-center gap-2 mb-3">
        <Clock size={18} color="#6B7280" />
        <Text className="text-sm font-semibold text-gray-700">
          Contact Cadence
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {CADENCE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg border ${
                isSelected
                  ? "bg-blue-100 border-blue-500"
                  : "bg-gray-50 border-gray-200"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? "text-blue-700" : "text-gray-600"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="text-xs text-gray-500 mt-2">
        How often you want to stay in touch with this contact.
      </Text>
    </View>
  );
}
