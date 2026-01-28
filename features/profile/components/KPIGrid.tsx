import React from "react";
import { View } from "react-native";

interface KPIGridProps {
  children: React.ReactNode;
}

export function KPIGrid({ children }: KPIGridProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {React.Children.map(children, (child) => (
        <View className="flex-1 min-w-[45%]">{child}</View>
      ))}
    </View>
  );
}
