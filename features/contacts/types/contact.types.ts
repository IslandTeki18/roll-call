export type Contact = {
  id: string;
  givenName: string;
  familyName?: string;
  company?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  tags?: string[];
  pinned?: boolean;
  lastTouchedAt?: string; // ISO
  isFresh?: boolean; // UI-only flag
};
