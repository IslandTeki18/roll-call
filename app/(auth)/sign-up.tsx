import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn]);

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
      <View className="flex-1 bg-slate-900 px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold mb-2 text-white">
            Check your email
          </Text>
          <Text className="text-gray-300 text-lg">
            We sent a verification code to {emailAddress}
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium mb-2 text-gray-300">
            Verification Code
          </Text>
          <TextInput
            value={code}
            placeholder="123456"
            placeholderTextColor="#6B7280"
            onChangeText={setCode}
            className="bg-slate-900 px-4 py-4 rounded-xl text-base text-center tracking-widest text-white"
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
    <View className="flex-1 bg-slate-900 px-6 justify-center">
      <View className="mb-12">
        <Text className="text-4xl font-bold mb-2 text-white">
          Create account
        </Text>
        <Text className="text-gray-300 text-lg">Get started with RollCall</Text>
      </View>

      <View className="gap-4 mb-6">
        <View>
          <Text className="text-sm font-medium mb-2 text-gray-300">Email</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
            onChangeText={setEmailAddress}
            className="bg-slate-900 px-4 py-4 rounded-xl text-base text-white"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-sm font-medium mb-2 text-gray-300">
            Password
          </Text>
          <TextInput
            value={password}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            secureTextEntry={true}
            onChangeText={setPassword}
            className="bg-slate-900 px-4 py-4 rounded-xl text-base text-white"
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
        <Text className="text-gray-400">Already have an account?</Text>
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity>
            <Text className="text-blue-600 font-semibold">Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
