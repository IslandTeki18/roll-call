import { getContactById } from "@/features/contacts/api/contacts.service";
import { calculateRHS } from "@/features/deck/api/rhs.service";
import { getRecentEvents } from "@/features/messaging/api/engagement.service";
import { EnrichedInteraction } from "../types/profile.types";

export async function getRecentInteractions(
  userId: string,
  limit: number = 10
): Promise<EnrichedInteraction[]> {
  try {
    // Fetch recent events
    const events = await getRecentEvents(userId, limit);

    // Filter to meaningful engagement types only
    const meaningfulTypes = ["sms_sent", "call_made", "email_sent", "facetime_made", "slack_sent"];
    const meaningfulEvents = events.filter(event =>
      meaningfulTypes.includes(event.type)
    );

    // Extract unique contact IDs (contactIds is comma-separated string)
    const allContactIds = meaningfulEvents.flatMap(event =>
      event.contactIds.split(",").filter(id => id.trim())
    );
    const uniqueContactIds = Array.from(new Set(allContactIds));

    // Batch fetch contacts
    const contactsResults = await Promise.all(
      uniqueContactIds.map(id => getContactById(id))
    );

    // Create contact map
    const contactMap = new Map();
    contactsResults.forEach(contact => {
      if (contact) {
        contactMap.set(contact.$id, contact);
      }
    });

    // Batch calculate RHS scores
    const rhsResults = await Promise.all(
      uniqueContactIds.map(async (contactId) => {
        const contact = contactMap.get(contactId);
        if (!contact) return { contactId, rhs: 0 };
        const rhs = await calculateRHS(userId, contact);
        return { contactId, rhs };
      })
    );

    // Create RHS map
    const rhsMap = new Map();
    rhsResults.forEach(result => {
      rhsMap.set(result.contactId, result.rhs);
    });

    // Enrich interactions - for events with multiple contacts, create one interaction per contact
    const enrichedInteractions: EnrichedInteraction[] = [];

    for (const event of meaningfulEvents) {
      const contactIds = event.contactIds.split(",").filter(id => id.trim());

      for (const contactId of contactIds) {
        const contact = contactMap.get(contactId);
        if (!contact) continue;

        enrichedInteractions.push({
          eventId: event.$id,
          contactId: contactId,
          contactName: contact.displayName,
          organization: contact.organization,
          jobTitle: contact.jobTitle,
          rhsScore: rhsMap.get(contactId) || 0,
          engagementType: event.type,
          timestamp: event.timestamp,
        });
      }
    }

    return enrichedInteractions;
  } catch (error) {
    console.error("Failed to get recent interactions:", error);
    return [];
  }
}
