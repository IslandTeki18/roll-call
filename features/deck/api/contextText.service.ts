import type { DeckCard } from "../types/deck.types";
import type { EngagementEvent } from "@/features/messaging/api/engagement.service";

/**
 * Generate contextual text for a deck card based on engagement history
 */
export function generateContextText(
  card: DeckCard,
  lastEngagement: EngagementEvent | null,
  daysSinceEngagement: number
): string {
  const contactName = card.contact?.displayName || "them";

  // Fresh contact (new to your contacts, no engagement yet)
  if (card.isFresh && !lastEngagement) {
    return `You recently added ${contactName} to your contacts`;
  }

  // Never engaged (not fresh, but no history)
  if (!lastEngagement) {
    return "This is a new connection — reach out to stay in touch";
  }

  // Recent engagement
  if (daysSinceEngagement <= 1) {
    const action = getActionText(lastEngagement.type);
    return `You ${action} ${contactName} yesterday`;
  }

  if (daysSinceEngagement <= 7) {
    const action = getActionText(lastEngagement.type);
    return `You ${action} ${contactName} ${daysSinceEngagement} days ago`;
  }

  // Long gap (more than 7 days)
  if (daysSinceEngagement <= 30) {
    return `It's been ${daysSinceEngagement} days since you reached out`;
  }

  // Very long gap (more than 30 days)
  if (daysSinceEngagement <= 60) {
    return `It's been over a month since you connected`;
  }

  // Extremely long gap (more than 60 days)
  return `It's been ${Math.floor(daysSinceEngagement / 30)} months since you reached out`;
}

/**
 * Convert engagement type to human-readable action text
 */
function getActionText(type: string): string {
  switch (type) {
    case "sms_sent":
      return "texted";
    case "call_made":
      return "called";
    case "email_sent":
      return "emailed";
    case "facetime_made":
      return "FaceTimed";
    case "slack_sent":
      return "messaged";
    case "note_added":
      return "made a note about";
    default:
      return "contacted";
  }
}

/**
 * Calculate days since last engagement from timestamp
 */
export function calculateDaysSinceEngagement(
  lastEngagementTimestamp: string | null
): number {
  if (!lastEngagementTimestamp) return 0;

  const lastDate = new Date(lastEngagementTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}
