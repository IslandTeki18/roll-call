import React from "react";
import { Text, View } from "react-native";

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function KPICard({ label, value, icon }: KPICardProps) {
  const isLongValue = typeof value === "string" && value.length > 10;

  return (
    <View
      style={{ backgroundColor: "#2E2E33" }}
      className="rounded-2xl overflow-hidden border border-white/10"
    >
      <View className="p-4 items-center justify-center min-h-[100px]">
        {icon && <View className="mb-2">{icon}</View>}
        <Text
          className={`font-bold text-white mb-1 text-center ${
            isLongValue ? "text-lg" : "text-3xl"
          }`}
          numberOfLines={isLongValue ? 2 : 1}
        >
          {value}
        </Text>
        <Text className="text-xs text-gray-400 text-center">
          {label}
        </Text>
      </View>
    </View>
  );
}
