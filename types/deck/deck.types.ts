import { ProfileContact } from "../../../services/contacts.service";

export type CardStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "snoozed";

export type ChannelType = "sms" | "call" | "facetime" | "email" | "slack";

export interface DeckCard {
  id: string;
  contact: ProfileContact;
  status: CardStatus;
  isFresh: boolean; // NEW pill for contacts < 14 days
  rhsScore: number; // Relationship Health Score
  suggestedChannel: ChannelType;
  reason: string; // Why this contact surfaced (e.g., "Haven't connected in 2 weeks")
  completedAt?: string;
  outcomeId?: string;
}

export interface Draft {
  id: string;
  text: string;
  tone: "casual" | "professional" | "warm";
  channel: ChannelType;
}

export interface DeckState {
  id: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  cards: DeckCard[];
  maxCards: number; // 5 free, 10 premium
  generatedAt: string;
  completedAt?: string;
}
