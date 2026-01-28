import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { calculateRHS } from "@/features/deck/api/rhs.service";
import { generateRHSAnalytics } from "@/features/deck/api/rhs.analytics";
import { getEventsByContact, getEventsByDateRange, getLastEventForContact } from "@/features/messaging/api/engagement.service";
import { UserProfileAnalytics, ContactProfileAnalytics } from "../types/profile.types";

export async function getUserAnalytics(
  userId: string,
  contacts: ProfileContact[]
): Promise<UserProfileAnalytics> {
  try {
    // Total contacts
    const totalContacts = contacts.length;

    // Generate RHS analytics
    const rhsAnalytics = await generateRHSAnalytics(userId, contacts);
    const averageRHS = rhsAnalytics.averageRHS;
    const highPriorityContacts = rhsAnalytics.highPriorityCount;

    // Engagements this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyEvents = await getEventsByDateRange(
      userId,
      oneWeekAgo.toISOString(),
      new Date().toISOString()
    );

    // Filter to meaningful engagement types
    const meaningfulTypes = ["sms_sent", "call_made", "email_sent", "facetime_made", "slack_sent"];
    const engagementsThisWeek = weeklyEvents.filter(event =>
      meaningfulTypes.includes(event.type)
    ).length;

    return {
      totalContacts,
      averageRHS,
      engagementsThisWeek,
      highPriorityContacts,
    };
  } catch (error) {
    console.error("Failed to get user analytics:", error);
    return {
      totalContacts: 0,
      averageRHS: 0,
      engagementsThisWeek: 0,
      highPriorityContacts: 0,
    };
  }
}

export async function getContactAnalytics(
  userId: string,
  contact: ProfileContact
): Promise<ContactProfileAnalytics> {
  try {
    // Calculate RHS score
    const rhsResult = await calculateRHS(userId, contact);
    const rhsScore = rhsResult.totalScore;

    // Get last event
    const lastEvent = await getLastEventForContact(userId, contact.$id);
    const daysSinceContact = lastEvent
      ? Math.floor(
          (Date.now() - new Date(lastEvent.timestamp).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : -1;

    // Get total engagements
    const events = await getEventsByContact(userId, contact.$id);
    const meaningfulTypes = ["sms_sent", "call_made", "email_sent", "facetime_made", "slack_sent"];
    const totalEngagements = events.filter(event =>
      meaningfulTypes.includes(event.type)
    ).length;

    // Calculate cadence status
    let cadenceStatus = "No cadence";
    if (contact.cadenceDays && contact.cadenceDays > 0) {
      if (daysSinceContact === -1) {
        cadenceStatus = "Never contacted";
      } else if (daysSinceContact <= contact.cadenceDays) {
        cadenceStatus = "On Track";
      } else {
        const daysOverdue = daysSinceContact - contact.cadenceDays;
        cadenceStatus = `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue`;
      }
    }

    return {
      rhsScore,
      daysSinceContact,
      totalEngagements,
      cadenceStatus,
    };
  } catch (error) {
    console.error("Failed to get contact analytics:", error);
    return {
      rhsScore: 0,
      daysSinceContact: -1,
      totalEngagements: 0,
      cadenceStatus: "Error",
    };
  }
}
