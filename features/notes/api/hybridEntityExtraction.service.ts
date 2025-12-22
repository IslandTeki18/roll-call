import {
  extractEntities as extractDeterministicEntities,
  linkDatesToCommitments,
} from "./entityParser.service";
import {
  EntityExtractionResult,
  ParsedEntity,
  StructuredEntities,
} from "../types/entities.types";

/**
 * Hybrid entity extraction combining deterministic and AI approaches
 *
 * Flow:
 * 1. Run deterministic parsers first (fast, free, structured)
 * 2. Optionally enhance with AI extraction (slow, paid, unstructured)
 * 3. Merge and deduplicate results
 */

/**
 * Convert AI-extracted entities (flat string array) to structured entities
 */
const convertAIEntitiesToStructured = (
  aiEntities: string[],
  deterministicResult: EntityExtractionResult
): ParsedEntity[] => {
  // Create set of both value and normalizedValue for better matching
  const deterministicValues = new Set<string>();
  deterministicResult.allEntities.forEach((e) => {
    if (e.value) deterministicValues.add(e.value.toLowerCase());
    if (e.normalizedValue) deterministicValues.add(e.normalizedValue.toLowerCase());
  });

  // Only add AI entities that weren't found deterministically
  return aiEntities
    .filter((entity) => {
      const normalized = entity.toLowerCase().trim();
      return !deterministicValues.has(normalized);
    })
    .map((entity) => ({
      type: "other" as const,
      value: entity,
      normalizedValue: entity.toLowerCase().trim(),
      confidence: "medium" as const,
      source: "ai" as const,
    }));
};

/**
 * Main hybrid extraction function
 * Always runs deterministic extraction, optionally merges with AI results
 */
export const extractEntitiesHybrid = (
  text: string,
  aiEntities?: string[]
): EntityExtractionResult => {
  const startTime = Date.now();

  // Always run deterministic extraction first
  const deterministicResult = extractDeterministicEntities(text);

  // Link dates to commitments
  const linkedCommitments = linkDatesToCommitments(
    deterministicResult.structured.commitments,
    deterministicResult.structured.dates,
    text
  );

  deterministicResult.structured.commitments = linkedCommitments;

  // If AI entities provided, merge them
  if (aiEntities && aiEntities.length > 0) {
    const aiParsedEntities = convertAIEntitiesToStructured(
      aiEntities,
      deterministicResult
    );

    deterministicResult.structured.other = aiParsedEntities;
    deterministicResult.allEntities = [
      ...deterministicResult.allEntities,
      ...aiParsedEntities,
    ];

    deterministicResult.metadata.aiCount = aiParsedEntities.length;
    deterministicResult.metadata.totalCount =
      deterministicResult.metadata.deterministicCount + aiParsedEntities.length;
  }

  deterministicResult.metadata.processingTime = Date.now() - startTime;

  return deterministicResult;
};

/**
 * Serialize structured entities to JSON string for database storage
 */
export const serializeStructuredEntities = (
  structured: StructuredEntities
): string => {
  return JSON.stringify(structured);
};

/**
 * Deserialize structured entities from JSON string
 */
export const deserializeStructuredEntities = (
  json: string
): StructuredEntities | null => {
  try {
    return JSON.parse(json) as StructuredEntities;
  } catch {
    return null;
  }
};

/**
 * Get entity summary for display
 */
export const getEntitySummary = (
  structured: StructuredEntities
): {
  total: number;
  byType: Record<string, number>;
  highlights: string[];
} => {
  const byType = {
    people: structured.people.length,
    companies: structured.companies.length,
    dates: structured.dates.length,
    locations: structured.locations.length,
    commitments: structured.commitments.length,
    relationshipSignals: structured.relationshipSignals.length,
    contacts: structured.contacts.length,
    other: structured.other.length,
  };

  const total = Object.values(byType).reduce((sum, count) => sum + count, 0);

  const highlights: string[] = [];

  // Add interesting highlights
  if (structured.commitments.length > 0) {
    highlights.push(
      `${structured.commitments.length} commitment${structured.commitments.length > 1 ? "s" : ""}`
    );
  }

  if (structured.dates.length > 0) {
    const futureDates = structured.dates.filter((d) => d.metadata?.isFuture);
    if (futureDates.length > 0) {
      highlights.push(
        `${futureDates.length} upcoming date${futureDates.length > 1 ? "s" : ""}`
      );
    }
  }

  if (structured.people.length > 0) {
    highlights.push(
      `${structured.people.length} person mentioned${structured.people.length > 1 ? "people" : ""}`
    );
  }

  if (structured.relationshipSignals.length > 0) {
    highlights.push("relationship context");
  }

  return { total, byType, highlights };
};

/**
 * Extract actionable items from structured entities
 * Useful for generating next steps
 */
export const extractActionableItems = (
  structured: StructuredEntities
): string[] => {
  const items: string[] = [];

  // Commitments with dates
  structured.commitments.forEach((commitment) => {
    if (commitment.metadata?.linkedDate) {
      const verb = commitment.metadata.actionVerb || "follow up";
      const date = new Date(commitment.metadata.linkedDate).toLocaleDateString();
      items.push(`${verb} by ${date}`);
    } else if (commitment.metadata?.direction === "outbound") {
      items.push(commitment.value);
    }
  });

  // Future dates without commitments
  structured.dates
    .filter((d) => d.metadata?.isFuture)
    .forEach((date) => {
      const dateStr = new Date(date.normalizedValue!).toLocaleDateString();
      items.push(`Event on ${dateStr}`);
    });

  return items;
};
