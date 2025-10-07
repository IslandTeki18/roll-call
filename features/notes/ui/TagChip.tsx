import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface TagChipProps {
  tag: string;
  variant?: "default" | "selected" | "outlined";
  size?: "sm" | "md" | "lg";
  onPress?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  showRemove?: boolean;
}

export const TagChip: React.FC<TagChipProps> = ({
  tag,
  variant = "default",
  size = "md",
  onPress,
  onRemove,
  showRemove = false,
}) => {
  // Variant styles
  const variantClasses = {
    default: "bg-indigo-50 border-indigo-50",
    selected: "bg-indigo-600 border-indigo-600",
    outlined: "bg-white border-indigo-200",
  };

  const textVariantClasses = {
    default: "text-indigo-600",
    selected: "text-white",
    outlined: "text-indigo-600",
  };

  // Size styles
  const sizeClasses = {
    sm: "px-2 py-0.5",
    md: "px-2.5 py-1",
    lg: "px-3 py-1.5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      className={`
        flex-row items-center gap-1 rounded-md border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
      `}
      onPress={onPress ? () => onPress(tag) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text
        className={`
          font-medium
          ${textVariantClasses[variant]}
          ${textSizeClasses[size]}
        `}
      >
        {tag}
      </Text>

      {showRemove && onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(tag)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text
            className={`
              font-bold
              ${textVariantClasses[variant]}
              ${size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}
            `}
          >
            ×
          </Text>
        </TouchableOpacity>
      )}
    </Wrapper>
  );
};
