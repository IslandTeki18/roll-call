import { Lock, TrendingUp, Users, MessageCircle, Calendar, Clock } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePremiumGate } from "../features/auth/hooks/usePremiumGate";
import { useUser } from "@clerk/clerk-expo";
import { loadContacts } from "../features/contacts/api/contacts.service";
import { getRecentEvents } from "../features/messaging/api/engagement.service";
import { queryRHSMetrics } from "../features/deck/api/rhsMetrics.service";

export default function Reports() {
  const { isPremium, requirePremium } = usePremiumGate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
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
      });
    }
  }, [isPremium]);

  useEffect(() => {
    if (isPremium && user) {
      loadReportData();
    }
  }, [isPremium, user]);

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
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-gray-200 rounded-full p-6 mb-4">
            <Lock size={48} color="#6B7280" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Premium Feature
          </Text>
          <Text className="text-gray-600 text-center mb-6">
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading your reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Reports</Text>
          <Text className="text-gray-600 mb-6">
            Track your relationship health and engagement patterns
          </Text>

          {/* Quick Stats */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Stats</Text>
            <View className="flex-row flex-wrap gap-3">
              {/* Total Contacts */}
              <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-100 rounded-full p-2 mr-2">
                    <Users size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-gray-600 text-sm">Total Contacts</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">{stats.totalContacts}</Text>
              </View>

              {/* This Week */}
              <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="bg-green-100 rounded-full p-2 mr-2">
                    <MessageCircle size={20} color="#10B981" />
                  </View>
                  <Text className="text-gray-600 text-sm">This Week</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">{stats.engagementsThisWeek}</Text>
              </View>

              {/* This Month */}
              <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="bg-purple-100 rounded-full p-2 mr-2">
                    <Calendar size={20} color="#8B5CF6" />
                  </View>
                  <Text className="text-gray-600 text-sm">This Month</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">{stats.engagementsThisMonth}</Text>
              </View>

              {/* Average RHS */}
              <View className="bg-white rounded-xl p-4 flex-1 min-w-[45%] shadow-sm">
                <View className="flex-row items-center mb-2">
                  <View className="bg-orange-100 rounded-full p-2 mr-2">
                    <TrendingUp size={20} color="#F97316" />
                  </View>
                  <Text className="text-gray-600 text-sm">Avg RHS</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
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
            <Text className="text-lg font-semibold text-gray-900 mb-3">Analytics</Text>

            {/* Engagement Heatmap */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Engagement Heatmap")}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3 mr-3">
                    <Calendar size={24} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      Engagement Heatmap
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Visualize your engagement patterns
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-700">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cooling Contacts List */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Cooling Contacts")}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-3 mr-3">
                    <Clock size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      Cooling Contacts
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Relationships that need attention
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-700">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Streak Tracking */}
            <TouchableOpacity
              onPress={() => handleComingSoon("Streak Tracking")}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 mr-3">
                    <TrendingUp size={24} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      Streak Tracking
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Monitor your consistency
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-700">Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* RHS Trends */}
            <TouchableOpacity
              onPress={() => handleComingSoon("RHS Trends")}
              className="bg-white rounded-xl p-4 shadow-sm active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-3 mr-3">
                    <TrendingUp size={24} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      RHS Trends Over Time
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Track relationship health changes
                    </Text>
                  </View>
                </View>
                <View className="bg-yellow-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-yellow-700">Soon</Text>
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
