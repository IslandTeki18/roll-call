// deck.queries.ts
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { DeckState, Contact, UserPreferences, DeckCard } from "./deck.types";
import { CardOrderingService } from "./cardOrder";
import { CardBuilders } from "./cardBuilders";

export interface DeckQueries {
  useTodaysDeck: () => UseQueryResult<DeckState>;
  useContacts: () => UseQueryResult<Contact[]>;
  useUserPreferences: () => UseQueryResult<UserPreferences>;
  useDeckHistory: (days: number) => UseQueryResult<DeckState[]>;
}

/**
 * Hook to get today's deck
 */
export const useTodaysDeck = (): UseQueryResult<DeckState> => {
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["deck", today],
    queryFn: async (): Promise<DeckState> => {
      // In a real app, this would fetch from your backend/database
      // For now, we'll generate a demo deck

      const contacts = await fetchContacts();
      const userPreferences = await fetchUserPreferences();

      const cards = CardOrderingService.generateDeckCards(
        contacts,
        userPreferences
      );

      return {
        date: today,
        cards,
        completedCards: [], // Would be loaded from storage
        currentCardIndex: 0,
        isComplete: false,
        maxCards: userPreferences.deckSize,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get all contacts
 */
export const useContacts = (): UseQueryResult<Contact[]> => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      // In a real app, this would fetch from device contacts + external sources
      return await fetchContacts();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Hook to get user preferences
 */
export const useUserPreferences = (): UseQueryResult<UserPreferences> => {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: async (): Promise<UserPreferences> => {
      return await fetchUserPreferences();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

/**
 * Hook to get deck history
 */
export const useDeckHistory = (
  days: number = 7
): UseQueryResult<DeckState[]> => {
  return useQuery({
    queryKey: ["deck-history", days],
    queryFn: async (): Promise<DeckState[]> => {
      const history: DeckState[] = [];
      const today = new Date();

      for (let i = 1; i <= days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];

        // In a real app, fetch from storage/database
        const deckState = await fetchDeckForDate(dateString);
        if (deckState) {
          history.push(deckState);
        }
      }

      return history;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook to get Fresh connections specifically
 */
export const useFreshConnections = (): UseQueryResult<Contact[]> => {
  return useQuery({
    queryKey: ["fresh-connections"],
    queryFn: async (): Promise<Contact[]> => {
      const contacts = await fetchContacts();
      return contacts.filter((contact) =>
        CardOrderingService.isFreshConnection(contact)
      );
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook to get deck completion stats
 */
export const useDeckStats = (): UseQueryResult<{
  streak: number;
  completionRate: number;
  totalTouches: number;
  avgCardsPerDay: number;
}> => {
  return useQuery({
    queryKey: ["deck-stats"],
    queryFn: async () => {
      // In a real app, calculate from stored deck history
      return {
        streak: 5, // Days in a row with completed decks
        completionRate: 0.85, // 85% completion rate
        totalTouches: 47, // Total touches this month
        avgCardsPerDay: 4.2, // Average cards completed per day
      };
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
};

// Mock data functions (in a real app, these would be actual API calls)

async function fetchContacts(): Promise<Contact[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return demo contacts
  return [
    CardBuilders.createDemoContact({
      id: "1",
      firstName: "Sarah",
      lastName: "Chen",
      displayName: "Sarah Chen",
      emails: ["sarah.chen@example.com"],
      phoneNumbers: ["+1 (555) 123-4567"],
      tags: ["colleague", "vip"],
      firstSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      lastInteraction: undefined, // Fresh connection
      cadencePreference: "weekly",
      source: "device",
    }),
    CardBuilders.createDemoContact({
      id: "2",
      firstName: "Mike",
      lastName: "Rodriguez",
      displayName: "Mike Rodriguez",
      emails: ["mike.r@startup.com"],
      phoneNumbers: ["+1 (555) 234-5678"],
      tags: ["investor"],
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastInteraction: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      cadencePreference: "biweekly",
      mutualityScore: 9,
      source: "google",
    }),
    CardBuilders.createDemoContact({
      id: "3",
      firstName: "Jennifer",
      lastName: "Wu",
      displayName: "Jennifer Wu",
      emails: ["jwu@designco.com"],
      phoneNumbers: ["+1 (555) 345-6789"],
      tags: ["client"],
      firstSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      cadencePreference: "weekly",
      mutualityScore: 8,
      source: "outlook",
    }),
    CardBuilders.createDemoContact({
      id: "4",
      firstName: "David",
      lastName: "Kim",
      displayName: "David Kim",
      emails: ["dkim@techcorp.com"],
      phoneNumbers: ["+1 (555) 456-7890"],
      tags: ["mentor"],
      firstSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      lastInteraction: undefined, // Fresh connection
      cadencePreference: "monthly",
      source: "slack",
    }),
    CardBuilders.createDemoContact({
      id: "5",
      firstName: "Amanda",
      lastName: "Foster",
      displayName: "Amanda Foster",
      emails: ["amanda@consulting.com"],
      phoneNumbers: ["+1 (555) 567-8901"],
      tags: ["colleague"],
      firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      lastInteraction: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      cadencePreference: "monthly",
      mutualityScore: 6,
      source: "device",
    }),
  ];
}

async function fetchUserPreferences(): Promise<UserPreferences> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    isPremium: false, // Start with free tier
    quietHours: { start: "22:00", end: "08:00" },
    dailyNudgeEnabled: true,
    deckSize: 5, // Free tier gets 5 cards
  };
}

async function fetchDeckForDate(date: string): Promise<DeckState | null> {
  // Simulate fetching historical deck data
  await new Promise((resolve) => setTimeout(resolve, 100));

  // For demo purposes, return null (no historical data)
  return null;
}

/**
 * Query key factory for deck-related queries
 */
export const deckKeys = {
  all: ["deck"] as const,
  today: () => [...deckKeys.all, "today"] as const,
  date: (date: string) => [...deckKeys.all, date] as const,
  history: (days: number) => [...deckKeys.all, "history", days] as const,
  stats: () => [...deckKeys.all, "stats"] as const,
} as const;

/**
 * Contact query keys
 */
export const contactKeys = {
  all: ["contacts"] as const,
  fresh: () => [...contactKeys.all, "fresh"] as const,
} as const;

/**
 * User preferences query keys
 */
export const userKeys = {
  preferences: ["user-preferences"] as const,
} as const;
