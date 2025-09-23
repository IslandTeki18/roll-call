export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumbers?: string[];
  emails?: string[];
  avatar?: string;
  tags?: string[];
  isPinned?: boolean;
  firstSeen: Date;
  lastInteraction?: Date;
  cadencePreference?: "weekly" | "biweekly" | "monthly" | "quarterly";
  mutualityScore?: number;
  source: "device" | "google" | "outlook" | "slack";
}

export interface FreshConnection extends Contact {
  isFresh: true;
  daysSinceFirstSeen: number;
  freshBoost: number; // +25 decaying to 0 by day 21
}

export interface DeckCard {
  id: string;
  contact: Contact | FreshConnection;
  reason: string; // Why this contact is showing up
  priority: number;
  rhsScore: number; // Recency-Health-Score
  lastTouchContext?: string;
  suggestedChannels: Channel[];
}

export interface Channel {
  type:
    | "sms"
    | "call"
    | "facetime"
    | "email"
    | "slack"
    | "whatsapp"
    | "linkedin"
    | "telegram";
  label: string;
  value: string; // phone number, email, etc.
  isPremium: boolean;
  isAvailable: boolean;
}

export interface Draft {
  id: string;
  content: string;
  tone: "casual" | "professional" | "friendly";
  reason: string; // Why this draft was generated
  channel: Channel;
}

export interface Outcome {
  cardId: string;
  contactId: string;
  action: "sent" | "skipped" | "postponed";
  channel?: Channel;
  sentAt?: Date;
  note?: string; // Optional 140-char note
  nextFollowUp?: Date;
}

export interface DeckState {
  date: string; // YYYY-MM-DD
  cards: DeckCard[];
  completedCards: string[];
  currentCardIndex: number;
  isComplete: boolean;
  maxCards: number; // 5 for free, 10 for premium
}

export interface UserPreferences {
  isPremium: boolean;
  quietHours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  dailyNudgeEnabled: boolean;
  deckSize: number; // 5 or 10
}

export interface Note {
  id: string;
  content: string;
  contactIds: string[]; // Multi-contact support
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  aiSummary?: string;
  suggestedNextCTA?: string;
  suggestedNextDue?: Date;
  voiceTranscript?: string;
}

// RHS (Recency-Health-Score) calculation factors
export interface RHSFactors {
  recencyDecay: number;
  cadenceFit: number;
  tagPriority: number;
  manualMutuality: number;
  fatigueGuard: number;
  freshBoost: number;
}

export type DeckAction =
  | { type: "LOAD_DECK"; payload: { date: string } }
  | { type: "NEXT_CARD" }
  | { type: "PREVIOUS_CARD" }
  | { type: "COMPLETE_CARD"; payload: Outcome }
  | { type: "SKIP_CARD"; payload: { cardId: string; reason?: string } }
  | { type: "RESET_DECK" }
  | { type: "SET_CURRENT_CARD"; payload: { index: number } };

export interface DeckMachineContext {
  deckState: DeckState;
  userPreferences: UserPreferences;
  error?: string;
  isLoading: boolean;
}
