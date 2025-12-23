import * as chrono from "chrono-node";
import nlp from "compromise";
import {
  ParsedEntity,
  PersonEntity,
  CompanyEntity,
  DateEntity,
  LocationEntity,
  CommitmentEntity,
  RelationshipSignalEntity,
  ContactEntity,
  StructuredEntities,
  EntityExtractionResult,
} from "../types/entities.types";

/**
 * Deterministic entity parser using rule-based NLP
 * Extracts structured entities from note text
 */

// Commitment patterns
const COMMITMENT_PATTERNS = [
  { pattern: /\b(I'll|I will|gonna|going to)\s+(\w+)/gi, type: "outbound" as const },
  { pattern: /\b(you('ll| will)|can you|could you)\s+(\w+)/gi, type: "inbound" as const },
  { pattern: /\b(we'll|we will|let's|let us)\s+(\w+)/gi, type: "mutual" as const },
  { pattern: /\b(promised|agreed|committed)\s+to\s+(\w+)/gi, type: "mutual" as const },
  { pattern: /\b(need to|have to|must)\s+(\w+)/gi, type: "outbound" as const },
];

// Relationship signal patterns
const RELATIONSHIP_SIGNALS = {
  professional: [
    "boss", "manager", "supervisor", "colleague", "coworker", "employee",
    "team member", "client", "customer", "vendor", "partner", "CEO", "CTO",
  ],
  personal: [
    "friend", "close friend", "best friend", "buddy", "pal", "family",
    "brother", "sister", "mom", "dad", "cousin", "aunt", "uncle",
  ],
  transactional: [
    "client", "customer", "vendor", "supplier", "contractor", "consultant",
  ],
  hierarchical: [
    "mentor", "mentee", "teacher", "student", "advisor", "boss", "subordinate",
  ],
  temporal: [
    "old friend", "new contact", "former colleague", "ex-", "previous",
  ],
};

// Action verbs for commitments
const ACTION_VERBS = [
  "call", "email", "text", "message", "meet", "schedule", "send", "share",
  "review", "follow up", "check in", "connect", "reach out", "touch base",
];

/**
 * Extract person names using compromise NLP
 */
export const extractPeople = (text: string): PersonEntity[] => {
  const doc = nlp(text);
  const people = doc.people().out("array");

  return people.map((name: string) => ({
    type: "person" as const,
    value: name,
    normalizedValue: name.trim(),
    confidence: "high" as const,
    source: "deterministic" as const,
    metadata: {
      fullName: name.trim(),
    },
  }));
};

/**
 * Extract company/organization names using compromise NLP
 */
export const extractCompanies = (text: string): CompanyEntity[] => {
  const doc = nlp(text);
  const orgs = doc.organizations().out("array");

  return orgs.map((org: string) => ({
    type: "company" as const,
    value: org,
    normalizedValue: org.trim(),
    confidence: "medium" as const,
    source: "deterministic" as const,
    metadata: {
      name: org.trim(),
    },
  }));
};

/**
 * Extract dates using chrono-node
 */
export const extractDates = (text: string): DateEntity[] => {
  const results = chrono.parse(text);
  const now = new Date();

  return results.map((result) => {
    const parsedDate = result.start.date();
    const daysFromNow = Math.ceil(
      (parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      type: "date" as const,
      value: result.text,
      normalizedValue: parsedDate.toISOString(),
      confidence: "high" as const,
      source: "deterministic" as const,
      startIndex: result.index,
      endIndex: result.index + result.text.length,
      metadata: {
        originalText: result.text,
        parsedDate,
        isRelative: !result.text.match(/\d{4}/), // No year = relative
        isFuture: daysFromNow > 0,
        daysFromNow,
      },
    };
  });
};

/**
 * Extract locations using compromise NLP
 */
export const extractLocations = (text: string): LocationEntity[] => {
  const doc = nlp(text);
  const places = doc.places().out("array");

  return places.map((place: string) => ({
    type: "location" as const,
    value: place,
    normalizedValue: place.trim(),
    confidence: "medium" as const,
    source: "deterministic" as const,
    metadata: {
      locationType: "general" as const,
    },
  }));
};

/**
 * Extract commitments using pattern matching
 */
export const extractCommitments = (text: string): CommitmentEntity[] => {
  const commitments: CommitmentEntity[] = [];

  COMMITMENT_PATTERNS.forEach(({ pattern, type }) => {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const actionVerb = match[2]?.toLowerCase();
      const isActionVerb = ACTION_VERBS.includes(actionVerb);

      commitments.push({
        type: "commitment" as const,
        value: match[0],
        normalizedValue: match[0].trim(),
        confidence: isActionVerb ? "high" : "medium",
        source: "deterministic" as const,
        startIndex: match.index,
        metadata: {
          commitmentType: "promise" as const,
          direction: type,
          actionVerb: isActionVerb ? actionVerb : undefined,
        },
      });
    }
  });

  return commitments;
};

/**
 * Extract relationship signals using pattern matching
 */
export const extractRelationshipSignals = (text: string): RelationshipSignalEntity[] => {
  const signals: RelationshipSignalEntity[] = [];
  const lowerText = text.toLowerCase();

  Object.entries(RELATIONSHIP_SIGNALS).forEach(([signalType, keywords]) => {
    keywords.forEach((keyword) => {
      const pattern = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerText.matchAll(pattern);

      for (const match of matches) {
        signals.push({
          type: "relationship_signal" as const,
          value: keyword,
          normalizedValue: keyword.toLowerCase(),
          confidence: "high" as const,
          source: "deterministic" as const,
          startIndex: match.index,
          metadata: {
            signalType: signalType as any,
            relationshipRole: keyword,
          },
        });
      }
    });
  });

  return signals;
};

/**
 * Extract phone numbers using regex
 */
export const extractPhones = (text: string): ContactEntity[] => {
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const matches = text.matchAll(phonePattern);

  return Array.from(matches).map((match) => ({
    type: "phone" as const,
    value: match[0],
    normalizedValue: match[0].replace(/[-.]g/, ""),
    confidence: "high" as const,
    source: "deterministic" as const,
    startIndex: match.index,
    metadata: {
      isValid: true,
      formatted: match[0],
    },
  }));
};

/**
 * Extract email addresses using regex
 */
export const extractEmails = (text: string): ContactEntity[] => {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.matchAll(emailPattern);

  return Array.from(matches).map((match) => ({
    type: "email" as const,
    value: match[0],
    normalizedValue: match[0].toLowerCase(),
    confidence: "high" as const,
    source: "deterministic" as const,
    startIndex: match.index,
    metadata: {
      isValid: true,
    },
  }));
};

/**
 * Main entity extraction function
 * Combines all deterministic parsers
 */
export const extractEntities = (text: string): EntityExtractionResult => {
  const startTime = Date.now();

  const people = extractPeople(text);
  const companies = extractCompanies(text);
  const dates = extractDates(text);
  const locations = extractLocations(text);
  const commitments = extractCommitments(text);
  const relationshipSignals = extractRelationshipSignals(text);
  const phones = extractPhones(text);
  const emails = extractEmails(text);

  const contacts = [...phones, ...emails];

  const structured: StructuredEntities = {
    people,
    companies,
    dates,
    locations,
    commitments,
    relationshipSignals,
    contacts,
    other: [],
  };

  const allEntities: ParsedEntity[] = [
    ...people,
    ...companies,
    ...dates,
    ...locations,
    ...commitments,
    ...relationshipSignals,
    ...contacts,
  ];

  const processingTime = Date.now() - startTime;

  return {
    raw: text,
    structured,
    allEntities,
    metadata: {
      processingTime,
      deterministicCount: allEntities.length,
      aiCount: 0,
      totalCount: allEntities.length,
    },
  };
};

/**
 * Link extracted dates to commitments
 * Identifies which dates are associated with which commitments
 */
export const linkDatesToCommitments = (
  commitments: CommitmentEntity[],
  dates: DateEntity[],
  text: string
): CommitmentEntity[] => {
  return commitments.map((commitment) => {
    // Find the nearest date after this commitment in the text
    const nearestDate = dates.find(
      (date) =>
        date.startIndex !== undefined &&
        commitment.startIndex !== undefined &&
        date.startIndex > commitment.startIndex &&
        date.startIndex - commitment.startIndex < 100 // Within 100 chars
    );

    if (nearestDate) {
      return {
        ...commitment,
        metadata: {
          ...commitment.metadata,
          linkedDate: nearestDate.normalizedValue,
        },
      };
    }

    return commitment;
  });
};
