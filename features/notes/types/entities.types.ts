/**
 * Structured entity types extracted from note text
 * Combines deterministic parsing with AI extraction
 */

export type EntityType =
  | "person"
  | "company"
  | "date"
  | "location"
  | "commitment"
  | "relationship_signal"
  | "phone"
  | "email"
  | "url"
  | "other";

export interface ParsedEntity {
  type: EntityType;
  value: string;
  normalizedValue?: string; // Standardized form (e.g., ISO date)
  confidence: "high" | "medium" | "low";
  source: "deterministic" | "ai" | "hybrid";
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, any>;
}

export interface PersonEntity extends ParsedEntity {
  type: "person";
  metadata?: {
    firstName?: string;
    lastName?: string;
    fullName: string;
    possibleContactMatch?: string; // Contact ID if matched
  };
}

export interface CompanyEntity extends ParsedEntity {
  type: "company";
  metadata?: {
    name: string;
    industry?: string;
  };
}

export interface DateEntity extends ParsedEntity {
  type: "date";
  normalizedValue: string; // ISO 8601 format
  metadata?: {
    originalText: string;
    parsedDate: Date;
    isRelative: boolean; // "next week" vs "Jan 15"
    isFuture: boolean;
    daysFromNow?: number;
  };
}

export interface LocationEntity extends ParsedEntity {
  type: "location";
  metadata?: {
    city?: string;
    state?: string;
    country?: string;
    locationType?: "city" | "address" | "venue" | "general";
  };
}

export interface CommitmentEntity extends ParsedEntity {
  type: "commitment";
  metadata?: {
    commitmentType: "promise" | "meeting" | "task" | "followup";
    direction: "outbound" | "inbound" | "mutual"; // Who made the commitment
    linkedDate?: string; // ISO date if commitment has a deadline
    actionVerb?: string; // "call", "email", "meet", etc.
  };
}

export interface RelationshipSignalEntity extends ParsedEntity {
  type: "relationship_signal";
  metadata?: {
    signalType:
      | "professional" // "my boss", "colleague"
      | "personal" // "close friend", "family"
      | "transactional" // "vendor", "client"
      | "hierarchical" // "mentor", "mentee"
      | "temporal"; // "old friend", "new contact"
    relationshipStrength?: "strong" | "medium" | "weak";
    relationshipRole?: string; // "boss", "friend", "client", etc.
  };
}

export interface ContactEntity extends ParsedEntity {
  type: "phone" | "email";
  metadata?: {
    isValid: boolean;
    formatted?: string;
  };
}

export interface StructuredEntities {
  people: PersonEntity[];
  companies: CompanyEntity[];
  dates: DateEntity[];
  locations: LocationEntity[];
  commitments: CommitmentEntity[];
  relationshipSignals: RelationshipSignalEntity[];
  contacts: ContactEntity[];
  other: ParsedEntity[];
}

export interface EntityExtractionResult {
  raw: string;
  structured: StructuredEntities;
  allEntities: ParsedEntity[];
  metadata: {
    processingTime: number;
    deterministicCount: number;
    aiCount: number;
    totalCount: number;
  };
}
