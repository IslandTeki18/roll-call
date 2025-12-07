import { ProfileContact } from "@/features/contacts/api/contacts.service";

export type CardStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "snoozed";

export type ChannelType = "sms" | "call" | "facetime" | "email" | "slack";

export interface DeckCard {
  $id?: string;
  userId: string;
  cardId: string;
  contactId: string;
  date: string;
  status: CardStatus;
  draftedAt: string;
  sentAt: string;
  completedAt: string;
  linkedEngagementEventId: string;
  linkedOutcomeId: string;
  suggestedChannel: ChannelType;
  reason: string;
  rhsScore: number;
  isFresh: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Hydrated field (not in table)
  contact?: ProfileContact;
}

export interface Draft {
  id: string;
  text: string;
  tone: "casual" | "professional" | "warm";
  channel: ChannelType;
}

export interface DeckState {
  userId: string;
  date: string;
  cards: DeckCard[];
  maxCards: number;
  generatedAt: string;
  completedAt?: string;
}
