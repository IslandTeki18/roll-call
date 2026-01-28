export interface UserProfileAnalytics {
  totalContacts: number;
  averageRHS: number;
  engagementsThisWeek: number;
  highPriorityContacts: number;
}

export interface ContactProfileAnalytics {
  rhsScore: number;
  daysSinceContact: number;
  totalEngagements: number;
  cadenceStatus: string;
}

export interface EnrichedInteraction {
  eventId: string;
  contactId: string;
  contactName: string;
  organization?: string;
  jobTitle?: string;
  rhsScore: number;
  engagementType: string;
  timestamp: string;
}
