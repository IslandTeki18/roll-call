import { Contact } from "../types/contact.types";
export const MOCK_CONTACTS: Contact[] = [
  {
    id: "1",
    givenName: "Ava",
    familyName: "Ng",
    phone: "555-0101",
    tags: ["founder"],
    isFresh: true,
  },
  {
    id: "2",
    givenName: "Ramon",
    familyName: "Lee",
    email: "ramon@example.com",
    company: "Cinder",
    pinned: true,
  },
  {
    id: "3",
    givenName: "Priya",
    familyName: "Patel",
    phone: "555-0110",
    lastTouchedAt: "2025-09-20T10:00:00Z",
  },
];
