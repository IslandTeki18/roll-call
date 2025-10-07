import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface VoiceToTextButtonProps {
  isRecording?: boolean;
  isProcessing?: boolean;
  duration?: number; // Recording duration in seconds
  onPress: () => void;
  disabled?: boolean;
  variant?: "circular" | "pill";
  size?: "sm" | "md" | "lg";
}

export const VoiceToTextButton: React.FC<VoiceToTextButtonProps> = ({
  isRecording = false,
  isProcessing = false,
  duration = 0,
  onPress,
  disabled = false,
  variant = "circular",
  size = "md",
}) => {
  // Format duration to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Size styles
  const circularSizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  // State-based styling
  const getButtonClasses = () => {
    if (disabled) {
      return "bg-gray-200 border-gray-300";
    }
    if (isRecording) {
      return "bg-red-500 border-red-600";
    }
    if (isProcessing) {
      return "bg-indigo-100 border-indigo-200";
    }
    return "bg-indigo-600 border-indigo-700";
  };

  if (variant === "circular") {
    return (
      <View className="items-center gap-2">
        <TouchableOpacity
          className={`
            ${circularSizeClasses[size]}
            rounded-full border-2
            items-center justify-center
            ${getButtonClasses()}
            ${disabled ? "" : "shadow-lg"}
          `}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <Text className={`${iconSizeClasses[size]}`}>⏳</Text>
          ) : isRecording ? (
            <Text className={`${iconSizeClasses[size]}`}>⏹</Text>
          ) : (
            <Text className={`${iconSizeClasses[size]}`}>🎤</Text>
          )}
        </TouchableOpacity>

        {/* Duration display when recording */}
        {isRecording && duration > 0 && (
          <View className="bg-red-100 px-3 py-1 rounded-full">
            <Text className="text-sm font-semibold text-red-700">
              {formatDuration(duration)}
            </Text>
          </View>
        )}

        {/* Processing text */}
        {isProcessing && (
          <Text className="text-xs text-gray-500 font-medium">
            Transcribing...
          </Text>
        )}

        {/* Helper text when idle */}
        {!isRecording && !isProcessing && (
          <Text className="text-xs text-gray-500 font-medium">
            Tap to record
          </Text>
        )}
      </View>
    );
  }

  // Pill variant
  return (
    <TouchableOpacity
      className={`
        flex-row items-center gap-2 px-4 py-2.5 rounded-full border-2
        ${getButtonClasses()}
      `}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {isProcessing ? (
        <>
          <Text className="text-xl">⏳</Text>
          <Text
            className={`
            text-sm font-semibold
            ${disabled ? "text-gray-500" : "text-indigo-700"}
          `}
          >
            Transcribing...
          </Text>
        </>
      ) : isRecording ? (
        <>
          <Text className="text-xl">⏹</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-white">Recording</Text>
            {duration > 0 && (
              <View className="bg-red-700 px-2 py-0.5 rounded">
                <Text className="text-xs font-bold text-white">
                  {formatDuration(duration)}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <Text className="text-xl">🎤</Text>
          <Text
            className={`
            text-sm font-semibold
            ${disabled ? "text-gray-500" : "text-white"}
          `}
          >
            Voice to Text
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
