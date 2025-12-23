import { getEventsByContact } from "./engagement.service";
import {
  getOutcomeNotesByContact,
  OutcomeNote,
} from "@/features/outcomes/api/outcomeNotes.service";
import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { getNotesByContact } from "@/features/notes/api/notes.service";
import { Note } from "@/features/notes/types/notes.types";

export interface ContactRecommendation {
  suggestedChannel: "sms" | "email" | "call";
  suggestedTone: "casual" | "professional" | "warm";
  recentTopics: string[];
  sentimentTrend: "improving" | "stable" | "declining" | "unknown";
  responseRate: number; // 0-1
  reasoning: string;
  conversationContext: string; // Summary for AI draft context
}

/**
 * Analyzes engagement history to provide smart recommendations
 * for how to approach this contact
 */
export const getContactRecommendations = async (
  userId: string,
  contactId: string,
  contact?: ProfileContact
): Promise<ContactRecommendation> => {
  // Get recent engagement events, outcomes, and notes
  const [engagementEvents, outcomes, notes] = await Promise.all([
    getEventsByContact(userId, contactId, 20),
    getOutcomeNotesByContact(userId, contactId, 10),
    getNotesByContact(userId, contactId, 10),
  ]);

  // Calculate channel effectiveness (prefer SMS for now, but track others)
  const _channelCounts = {
    sms: engagementEvents.filter((e) => e.type === "sms_sent").length,
    email: engagementEvents.filter((e) => e.type === "email_sent").length,
    call: engagementEvents.filter((e) => e.type === "call_made").length,
  };

  // SMS is default suggested channel
  const suggestedChannel: "sms" | "email" | "call" = "sms";

  // Analyze sentiment trend from outcomes
  const sentimentTrend = analyzeSentimentTrend(outcomes);

  // Extract topics from both outcomes and notes
  const recentTopics = extractTopicsFromNotesAndOutcomes(outcomes, notes);

  // Calculate response rate (outcomes recorded / messages sent)
  const messagesSent = engagementEvents.filter((e) =>
    ["sms_sent", "email_sent", "slack_sent"].includes(e.type)
  ).length;
  const responseRate = messagesSent > 0 ? outcomes.length / messagesSent : 0;

  // Determine suggested tone
  const suggestedTone = determineTone(contact, outcomes);

  // Build reasoning string
  const reasoning = buildReasoning(
    sentimentTrend,
    recentTopics,
    responseRate,
    outcomes.length,
    notes.length
  );

  // Build conversation context for AI (enhanced with Notes)
  const conversationContext = buildConversationContext(
    outcomes,
    notes,
    recentTopics,
    sentimentTrend
  );

  return {
    suggestedChannel,
    suggestedTone,
    recentTopics,
    sentimentTrend,
    responseRate,
    reasoning,
    conversationContext,
  };
};

/**
 * Analyzes sentiment trend from recent outcomes
 */
function analyzeSentimentTrend(
  outcomes: OutcomeNote[]
): "improving" | "stable" | "declining" | "unknown" {
  if (outcomes.length < 2) return "unknown";

  // Look at last 3 outcomes
  const recent = outcomes.slice(0, 3);
  const sentimentScores = recent.map((o) => {
    switch (o.userSentiment) {
      case "positive":
        return 1;
      case "neutral":
        return 0;
      case "negative":
        return -1;
      case "mixed":
        return 0;
      default:
        return 0;
    }
  });

  if (sentimentScores.length < 2) return "unknown";

  // Compare most recent to average of previous
  const mostRecent = sentimentScores[0];
  const previousAvg =
    sentimentScores.slice(1).reduce((a: number, b) => a + b, 0) /
    (sentimentScores.length - 1);

  if (mostRecent > previousAvg + 0.3) return "improving";
  if (mostRecent < previousAvg - 0.3) return "declining";
  return "stable";
}

/**
 * Extracts conversation topics from both outcome notes and regular notes
 * Prioritizes AI-processed entities, falls back to keyword extraction
 */
function extractTopicsFromNotesAndOutcomes(
  outcomes: OutcomeNote[],
  notes: Note[]
): string[] {
  const topics = new Set<string>();

  // Get topics from outcome AI entities
  outcomes.forEach((outcome) => {
    if (outcome.aiEntities) {
      outcome.aiEntities
        .split(",")
        .forEach((entity) => topics.add(entity.trim().toLowerCase()));
    }
  });

  // Get topics from note AI entities
  notes
    .filter((note) => note.processingStatus === "completed")
    .forEach((note) => {
      if (note.aiEntities) {
        note.aiEntities
          .split(",")
          .forEach((entity) => topics.add(entity.trim().toLowerCase()));
      }
    });

  // If still no topics, extract from tags
  notes.forEach((note) => {
    if (note.tags) {
      note.tags
        .split(",")
        .forEach((tag) => topics.add(tag.trim().toLowerCase()));
    }
  });

  // If still no topics, do simple keyword extraction
  if (topics.size === 0 && (outcomes.length > 0 || notes.length > 0)) {
    const commonTopics = [
      "work",
      "project",
      "family",
      "travel",
      "meeting",
      "proposal",
      "budget",
      "collaboration",
      "lunch",
      "coffee",
      "catch up",
    ];

    [...outcomes, ...notes].forEach((item) => {
      const text = ("rawText" in item ? item.rawText : "").toLowerCase();
      commonTopics.forEach((topic) => {
        if (text.includes(topic)) topics.add(topic);
      });
    });
  }

  // Return up to 5 most relevant topics
  return Array.from(topics).slice(0, 5);
}

/**
 * Determines appropriate tone based on contact context
 */
function determineTone(
  contact: ProfileContact | undefined,
  outcomes: OutcomeNote[]
): "casual" | "professional" | "warm" {
  // Default to casual
  if (!contact) return "casual";

  // Professional if they have job title or organization
  if (contact.jobTitle || contact.organization) {
    return "professional";
  }

  // Warm if recent outcomes show positive sentiment
  if (outcomes.length > 0) {
    const recentPositive = outcomes
      .slice(0, 3)
      .filter((o) => o.userSentiment === "positive").length;
    if (recentPositive >= 2) return "warm";
  }

  return "casual";
}

/**
 * Builds reasoning string for why this approach is recommended
 * Now includes note context
 */
function buildReasoning(
  sentimentTrend: string,
  recentTopics: string[],
  responseRate: number,
  outcomeCount: number,
  noteCount: number
): string {
  const parts: string[] = [];

  if (sentimentTrend === "improving") {
    parts.push("Conversations getting more positive");
  } else if (sentimentTrend === "declining") {
    parts.push("Consider checking in");
  }

  if (recentTopics.length > 0) {
    parts.push(`Recent topics: ${recentTopics.slice(0, 3).join(", ")}`);
  }

  if (noteCount > 0) {
    parts.push(`${noteCount} note${noteCount > 1 ? "s" : ""} on file`);
  }

  if (outcomeCount > 0 && responseRate > 0.5) {
    parts.push("Good engagement history");
  } else if (outcomeCount === 0 && noteCount === 0) {
    parts.push("First real conversation - keep it light");
  }

  return parts.join(" • ") || "New connection";
}

/**
 * Builds conversation context string for AI draft generation
 * Enhanced to include Notes alongside OutcomeNotes, with proper weighting
 */
function buildConversationContext(
  outcomes: OutcomeNote[],
  notes: Note[],
  recentTopics: string[],
  sentimentTrend: string
): string {
  const parts: string[] = [];

  // Prioritize AI-processed notes (they have richer summaries)
  const processedNotes = notes
    .filter((n) => n.processingStatus === "completed" && n.aiSummary)
    .slice(0, 3);

  if (processedNotes.length > 0) {
    const summaries = processedNotes.map((n) => n.aiSummary).join(". ");
    parts.push(`Recent notes: ${summaries}`);
  }

  // Add outcome conversation summary if different from notes
  if (outcomes.length > 0 && outcomes[0].aiSummary) {
    parts.push(`Last interaction outcome: ${outcomes[0].aiSummary}`);
  }

  // Add next steps from most recent note or outcome
  const latestNote = processedNotes[0];
  const latestOutcome = outcomes[0];

  if (latestNote?.aiNextSteps) {
    const nextSteps = latestNote.aiNextSteps.split("|")[0];
    if (nextSteps) {
      parts.push(`Pending from notes: ${nextSteps}`);
    }
  } else if (latestOutcome?.aiNextSteps) {
    const nextSteps = latestOutcome.aiNextSteps.split("|")[0];
    if (nextSteps) {
      parts.push(`Follow up on: ${nextSteps}`);
    }
  }

  // Add topics context if not already covered
  if (recentTopics.length > 0 && parts.length < 2) {
    parts.push(`Previous topics discussed: ${recentTopics.join(", ")}`);
  }

  // Add sentiment context
  if (sentimentTrend === "improving") {
    parts.push("Relationship is strengthening");
  } else if (sentimentTrend === "declining") {
    parts.push("Reconnect with care");
  }

  // Fallback to raw note snippets if no AI processing
  if (parts.length === 0 && notes.length > 0) {
    const rawSnippets = notes
      .map((n) => n.rawText.substring(0, 100))
      .slice(0, 2)
      .join(". ");
    parts.push(`From your notes: ${rawSnippets}`);
  }

  return parts.join(". ") || "No previous conversation history";
}

/**
 * Calculates engagement frequency for RHS algorithm
 * Returns average days between engagements
 */
export const calculateEngagementFrequency = async (
  userId: string,
  contactId: string
): Promise<number> => {
  const events = await getEventsByContact(userId, contactId, 10);

  if (events.length < 2) return 0;

  // Calculate gaps between consecutive events
  const gaps: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const time1 = new Date(events[i].timestamp).getTime();
    const time2 = new Date(events[i + 1].timestamp).getTime();
    const daysDiff = (time1 - time2) / (1000 * 60 * 60 * 24);
    gaps.push(daysDiff);
  }

  // Return average gap
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
};

/**
 * Calculates outcome quality score (0-100)
 * Based on sentiment and AI-detected engagement quality
 */
export const calculateOutcomeQualityScore = async (
  userId: string,
  contactId: string
): Promise<number> => {
  const outcomes = await getOutcomeNotesByContact(userId, contactId, 5);

  if (outcomes.length === 0) return 50; // Neutral baseline

  // Score each outcome
  const scores = outcomes.map((outcome) => {
    let score = 50; // Start neutral

    // Sentiment impact
    switch (outcome.userSentiment) {
      case "positive":
        score += 30;
        break;
      case "negative":
        score -= 30;
        break;
      case "mixed":
        score += 10;
        break;
    }

    // Has next steps = engaged conversation
    if (outcome.aiNextSteps && outcome.aiNextSteps.length > 0) {
      score += 10;
    }

    // Has entities = substantive conversation
    if (outcome.aiEntities && outcome.aiEntities.split(",").length >= 2) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  });

  // Weight recent outcomes more heavily
  let weightedSum = 0;
  let weightSum = 0;
  scores.forEach((score, idx) => {
    const weight = 1 / (idx + 1); // Exponential decay
    weightedSum += score * weight;
    weightSum += weight;
  });

  return Math.round(weightedSum / weightSum);
};
