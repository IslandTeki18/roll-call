import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import React from "react";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      // Handle Clerk error responses
      if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const clerkError = err.errors[0];
        if (clerkError.code === "too_many_requests") {
          setError("Too many requests. Please try again in a bit.");
        } else {
          setError(clerkError.message || "Sign in failed. Please try again.");
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="mb-12">
        <Text className="text-4xl font-bold mb-2">Welcome back</Text>
        <Text className="text-gray-600 text-lg">Sign in to continue</Text>
      </View>

      {error && (
        <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
          <Text className="text-red-700 text-sm">{error}</Text>
        </View>
      )}

      <View className="gap-4 mb-6">
        <View>
          <Text className="text-sm font-medium mb-2 text-gray-700">Email</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="you@example.com"
            onChangeText={(text) => {
              setEmailAddress(text);
              setError(null);
            }}
            className="bg-gray-50 px-4 py-4 rounded-xl text-base"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View>
          <Text className="text-sm font-medium mb-2 text-gray-700">
            Password
          </Text>
          <TextInput
            value={password}
            placeholder="••••••••"
            secureTextEntry={true}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            className="bg-gray-50 px-4 py-4 rounded-xl text-base"
            editable={!loading}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={onSignInPress}
        disabled={loading}
        className={`py-4 rounded-xl mb-6 ${
          loading ? "bg-gray-400" : "bg-blue-600 active:opacity-80"
        }`}
      >
        <Text className="text-white text-center font-semibold text-base">
          {loading ? "Signing in..." : "Continue"}
        </Text>
      </TouchableOpacity>

      <View className="flex-row justify-center items-center gap-1">
        <Text className="text-gray-600">Don&apos;t have an account?</Text>
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity disabled={loading}>
            <Text className="text-blue-600 font-semibold">Sign up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
