import * as React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <View className="flex-1 bg-white px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold mb-2">Check your email</Text>
          <Text className="text-gray-600 text-lg">
            We sent a verification code to {emailAddress}
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium mb-2 text-gray-700">
            Verification Code
          </Text>
          <TextInput
            value={code}
            placeholder="123456"
            onChangeText={setCode}
            className="bg-gray-50 px-4 py-4 rounded-xl text-base text-center tracking-widest"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          onPress={onVerifyPress}
          className="bg-blue-600 py-4 rounded-xl active:opacity-80"
        >
          <Text className="text-white text-center font-semibold text-base">
            Verify
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="mb-12">
        <Text className="text-4xl font-bold mb-2">Create account</Text>
        <Text className="text-gray-600 text-lg">Get started with RollCall</Text>
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
        onPress={onSignUpPress}
        className="bg-blue-600 py-4 rounded-xl mb-6 active:opacity-80"
      >
        <Text className="text-white text-center font-semibold text-base">
          Continue
        </Text>
      </TouchableOpacity>

      <View className="flex-row justify-center items-center gap-1">
        <Text className="text-gray-600">Already have an account?</Text>
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity>
            <Text className="text-blue-600 font-semibold">Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
