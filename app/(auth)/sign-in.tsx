import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import React from "react";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="mb-12">
        <Text className="text-4xl font-bold mb-2">Welcome back</Text>
        <Text className="text-gray-600 text-lg">Sign in to continue</Text>
      </View>

      <View className="gap-4 mb-6">
        <View>
          <Text className="text-sm font-medium mb-2 text-gray-700">Email</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="you@example.com"
            onChangeText={setEmailAddress}
            className="bg-gray-50 px-4 py-4 rounded-xl text-base"
            keyboardType="email-address"
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
            onChangeText={setPassword}
            className="bg-gray-50 px-4 py-4 rounded-xl text-base"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={onSignInPress}
        className="bg-blue-600 py-4 rounded-xl mb-6 active:opacity-80 disabled:opacity-50"
        disabled={!emailAddress || !password}
      >
        <Text className="text-white text-center font-semibold text-base">
          Continue
        </Text>
      </TouchableOpacity>

      <View className="flex-row justify-center items-center gap-1">
        <Text className="text-gray-600">Don&apos;t have an account?</Text>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-blue-600 font-semibold">Sign up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
