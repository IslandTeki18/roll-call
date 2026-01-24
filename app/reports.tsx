import { Lock, TrendingUp, Users, MessageCircle, Calendar, Clock } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePremiumGate } from "../features/auth/hooks/usePremiumGate";
import { useUser } from "@clerk/clerk-expo";
import { loadContacts } from "../features/contacts/api/contacts.service";
import { getRecentEvents } from "../features/messaging/api/engagement.service";
import { queryRHSMetrics } from "../features/deck/api/rhsMetrics.service";
import { useRouter } from "expo-router";

export default function Reports() {
  const { isPremium, requirePremium } = usePremiumGate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [stats, setStats] = useState({
    totalContacts: 0,
    engagementsThisWeek: 0,
    engagementsThisMonth: 0,
    averageRHS: 0,
    contactsWithRHS: 0,
  });
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState("");

  useEffect(() => {
    if (!isPremium) {
      requirePremium("Reports", () => {
        // TODO: Navigate to paywall
        router.push("/")
      });
    }
  }, [isPremium]);

  // useEffect(() => {
  //   if (isPremium && user) {
  //     loadReportData();
  //   }
  // }, [isPremium, user]);

  const loadReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get total contacts
      const contacts = await loadContacts(user.id);
      const totalContacts = contacts.length;

      // Get recent engagements
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allEvents = await getRecentEvents(user.id, 500);

      const engagementsThisWeek = allEvents.filter(
        (event) =>
          new Date(event.timestamp) >= oneWeekAgo &&
          ["sms_sent", "call_made", "email_sent", "facetime_made", "slack_sent"].includes(event.type)
      ).length;

      const engagementsThisMonth = allEvents.filter(
        (event) =>
          new Date(event.timestamp) >= oneMonthAgo &&
          ["sms_sent", "call_made", "email_sent", "facetime_made", "slack_sent"].includes(event.type)
      ).length;

      // Get RHS metrics
      const rhsMetrics = await queryRHSMetrics({
        userId: user.id,
        limit: 1000,
      });

      const contactsWithRHS = rhsMetrics.length;
      const averageRHS =
        contactsWithRHS > 0
          ? rhsMetrics.reduce((sum, metric) => sum + metric.rhsScore, 0) / contactsWithRHS
          : 0;

      setStats({
        totalContacts,
        engagementsThisWeek,
        engagementsThisMonth,
        averageRHS,
        contactsWithRHS,
      });
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComingSoon = (featureName: string) => {
    setComingSoonFeature(featureName);
    setShowComingSoon(true);
  };

  if (!isPremium) {
    return (
      <SafeAreaView className="flex-1 bg-gray-800">
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-gray-700 rounded-full p-6 mb-4">
            <Lock size={48} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-bold text-white mb-2">
            Premium Feature
          </Text>
          <Text className="text-gray-300 text-center mb-6">
            Unlock Reports to see your relationship health overview, overdue
            contacts, and streak tracking.
          </Text>
          <TouchableOpacity
            onPress={() => requirePremium("Reports")}
            className="bg-blue-600 px-8 py-4 rounded-xl active:bg-blue-700"
          >
            <Text className="text-white font-semibold">Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-800">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-300 mt-4">Loading your reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-800">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="text-3xl font-bold text-white mb-2">Reports</Text>
          <Text className="text-gray-300 mb-6">
            Track your relationship health and engagement patterns
          </Text>

          {/* Quick Stats */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-white mb-3">Quick Stats</Text>
            <View className="flex-row flex-wrap gap-3">
              {/* Total Contacts */}
              <View className="bg-gray-900 rounded-xl p-4 flex-1 min-w-[45%]">
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-900 rounded-full p-2 mr-2">
                    <Users size={20} color="#60A5FA" />
                  </View>
                  <Text className="text-gray-400 text-sm">Total Contacts</Text>
                </View>
                <Text className="text-2xl font-bold text-white">{stats.totalContacts}</Text>
              </View>

              {/* This Week */}
              <View className="bg-gray-900 rounded-xl p-4 flex-1 min-w-[45%]">
                <View className="flex-row items-center mb-2">
                  <View className="bg-green-900 rounded-full p-2 mr-2">
                    <MessageCircle size={20} color="#34D399" />
                  </View>
                  <Text className="text-gray-400 text-sm">This Week</Text>
                </View>
                <Text className="text-2xl font-bold text-white">{stats.engagementsThisWeek}</Text>
              </View>

              {/* This Month */}
              <View className="bg-gray-900 rounded-xl p-4 flex-1 min-w-[45%]">
                <View className="flex-row items-center mb-2">
                  <View className="bg-purple-900 rounded-full p-2 mr-2">
                    <Calendar size={20} color="#A78BFA" />
                  </View>
                  <Text className="text-gray-400 text-sm">This Month</Text>
                </View>
                <Text className="text-2xl font-bold text-white">{stats.engagementsThisMonth}</Text>
              </View>

              {/* Average RHS */}
              <View className="bg-gray-900 rounded-xl p-4 flex-1 min-w-[45%]">
                <View className="flex-row items-center mb-2">
                  <View className="bg-orange-900 rounded-full p-2 mr-2">
                    <TrendingUp size={20} color="#FB923C" />
                  </View>
                  <Text className="text-gray-400 text-sm">Avg RHS</Text>
                </View>
                <Text className="text-2xl font-bold text-white">
                  {stats.averageRHS.toFixed(1)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {stats.contactsWithRHS} contacts tracked
                </Text>
              </View>
            </View>
          </View>

          {/* Coming Soon Features */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-white mb-3">Analytics</Text>

            {/* Engagement Heatmap */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Engagement Heatmap")}
              className="bg-gray-900 rounded-xl p-4 mb-3 active:bg-gray-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-blue-900 rounded-lg p-3 mr-3">
                    <Calendar size={24} color="#60A5FA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      Engagement Heatmap
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Visualize your engagement patterns
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-900 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-300">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cooling Contacts List */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Cooling Contacts")}
              className="bg-gray-900 rounded-xl p-4 mb-3 active:bg-gray-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-orange-900 rounded-lg p-3 mr-3">
                    <Clock size={24} color="#FB923C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      Cooling Contacts
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Relationships that need attention
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-900 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-300">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Streak Tracking */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Streak Tracking")}
              className="bg-gray-900 rounded-xl p-4 mb-3 active:bg-gray-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-green-900 rounded-lg p-3 mr-3">
                    <TrendingUp size={24} color="#34D399" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      Streak Tracking
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Monitor your consistency
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-900 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-300">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* RHS Trends */}
            <TouchableOpacity
              onPress={() => handleComingSoon("RHS Trends")}
              className="bg-gray-900 rounded-xl p-4 active:bg-gray-700"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-purple-900 rounded-lg p-3 mr-3">
                    <TrendingUp size={24} color="#A78BFA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      RHS Trends Over Time
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Track relationship health changes
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-900 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-300">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComingSoon(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="bg-blue-100 rounded-full p-4 self-center mb-4">
              <Clock size={32} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {comingSoonFeature}
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              This feature is currently in development and will be available soon.
              Stay tuned for updates!
            </Text>
            <TouchableOpacity
              onPress={() => setShowComingSoon(false)}
              className="bg-blue-600 py-3 px-6 rounded-xl active:bg-blue-700"
            >
              <Text className="text-white font-semibold text-center">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
