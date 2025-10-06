import { DeckCard } from "../types/deck.types";

export const MOCK_DECK: DeckCard[] = [
  {
    id: "1",
    contactId: "contact-1", // Maps to Sarah Chen in communications mocks
    contactName: "Ava Ng",
    isFresh: true,
    drafts: [
      "How's your project going?",
      "Wanted to check in—free to catch up soon?",
    ],
  },
  {
    id: "2",
    contactId: "contact-2", // Maps to Marcus Johnson in communications mocks
    contactName: "Ramon Lee",
    drafts: ["Congrats on the new role!", "How are things at Cinder lately?"],
  },
  {
    id: "3",
    contactId: "contact-3", // Maps to Priya Patel in communications mocks
    contactName: "Sophia Patel",
    drafts: [
      "How's your project going?",
      "Wanted to check in—free to catch up soon?",
    ],
  },
];
