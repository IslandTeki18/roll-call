export interface DeckCard {
  id: string;
  contactId: string;
  contactName: string;
  avatarUrl?: string;
  isFresh?: boolean;
  drafts: string[];
  // Future fields from PRD
  lastTouch?: string;
  cadence?: string;
  tags?: string[];
}
