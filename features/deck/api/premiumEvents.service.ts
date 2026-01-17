/**
 * Premium Events Service
 *
 * Service layer handlers for premium-only features:
 * - E-Category: Calendar & Meetings (Google/Microsoft Calendar integration)
 * - F-Category: Email Signals (Email tracking, delivery, replies)
 * - G-Category: Slack Signals (Slack DM, reactions, threads)
 *
 * These handlers are ready for future UI integration.
 * All events require premium subscription and are gated accordingly.
 */

import { emitActionEventWithGating } from './actionEvents.service';
import type { ActionId } from '../types/contactScore.types';

/**
 * Emit meeting event (E-category)
 *
 * Called when a meeting with a contact is detected via calendar integration.
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param isPremiumUser - User's premium status
 * @param meetingData - Meeting metadata
 */
export async function emitMeetingEvent(
  userId: string,
  contactId: string,
  isPremiumUser: boolean,
  meetingData: {
    duration: number; // Minutes
    attendeeCount: number;
    keywords?: string[]; // From meeting title/description
    calendarEventId?: string;
    meetingTitle?: string;
  }
): Promise<void> {
  try {
    // Determine meeting type based on metadata
    let actionId: ActionId = 'meeting_group';

    if (meetingData.attendeeCount === 2) {
      actionId = 'meeting_1to1'; // One-on-one meeting (12 pts)
    } else if (meetingData.duration < 15) {
      actionId = 'meeting_short'; // Short meeting <15min (6 pts)
    }

    // Check for strategic keywords in meeting title
    const strategicKeywords = ['pitch', 'demo', 'interview', 'proposal', 'presentation'];
    if (
      meetingData.keywords?.some((k) =>
        strategicKeywords.some((sk) => k.toLowerCase().includes(sk))
      )
    ) {
      actionId = 'meeting_keyword'; // Strategic meeting (3 pts)
    }

    await emitActionEventWithGating(
      {
        userId,
        contactId,
        actionId,
        metadata: {
          duration: meetingData.duration,
          attendeeCount: meetingData.attendeeCount,
          keywords: meetingData.keywords,
          calendarEventId: meetingData.calendarEventId,
          meetingTitle: meetingData.meetingTitle,
        },
      },
      isPremiumUser
    );
  } catch (error) {
    console.error('Failed to emit meeting event:', error);
  }
}

/**
 * Emit calendar event created (E5)
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param isPremiumUser - User's premium status
 * @param eventData - Calendar event metadata
 */
export async function emitCalendarEventCreated(
  userId: string,
  contactId: string,
  isPremiumUser: boolean,
  eventData: {
    calendarEventId: string;
    eventTitle: string;
    scheduledDate: string;
  }
): Promise<void> {
  try {
    await emitActionEventWithGating(
      {
        userId,
        contactId,
        actionId: 'event_created',
        metadata: {
          calendarEventId: eventData.calendarEventId,
          eventTitle: eventData.eventTitle,
          scheduledDate: eventData.scheduledDate,
        },
      },
      isPremiumUser
    );
  } catch (error) {
    console.error('Failed to emit calendar event created:', error);
  }
}

/**
 * Emit email event (F-category)
 *
 * Called when email tracking detects delivery, opens, replies, etc.
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param isPremiumUser - User's premium status
 * @param emailData - Email tracking metadata
 */
export async function emitEmailEvent(
  userId: string,
  contactId: string,
  isPremiumUser: boolean,
  emailData: {
    eventType:
      | 'delivered'
      | 'reply'
      | 'reply_fast'
      | 'thread_depth'
      | 'link_click'
      | 'bounce'
      | 'unsub';
    emailId?: string;
    threadId?: string;
    threadDepth?: number; // Number of back-and-forth exchanges
    linkUrl?: string;
    replyTimeHours?: number;
  }
): Promise<void> {
  try {
    // Map event type to action ID
    const actionIdMap: Record<typeof emailData.eventType, ActionId> = {
      delivered: 'email_delivered',
      reply: 'email_reply',
      reply_fast: 'email_reply_fast',
      thread_depth: 'email_thread_depth',
      link_click: 'email_link_click',
      bounce: 'email_bounce',
      unsub: 'email_unsub',
    };

    const actionId = actionIdMap[emailData.eventType];

    await emitActionEventWithGating(
      {
        userId,
        contactId,
        actionId,
        channel: 'email',
        metadata: {
          emailId: emailData.emailId,
          threadId: emailData.threadId,
          threadDepth: emailData.threadDepth,
          linkUrl: emailData.linkUrl,
          replyTimeHours: emailData.replyTimeHours,
        },
      },
      isPremiumUser
    );
  } catch (error) {
    console.error('Failed to emit email event:', error);
  }
}

/**
 * Emit Slack event (G-category)
 *
 * Called when Slack integration detects DMs, reactions, mentions, etc.
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param isPremiumUser - User's premium status
 * @param slackData - Slack event metadata
 */
export async function emitSlackEvent(
  userId: string,
  contactId: string,
  isPremiumUser: boolean,
  slackData: {
    eventType: 'dm_sent' | 'dm_reply' | 'reaction' | 'mention' | 'thread_depth';
    slackMessageId?: string;
    threadId?: string;
    threadDepth?: number;
    reactionType?: string; // Emoji name
    channelId?: string;
  }
): Promise<void> {
  try {
    // Map event type to action ID
    const actionIdMap: Record<typeof slackData.eventType, ActionId> = {
      dm_sent: 'slack_dm_sent',
      dm_reply: 'slack_dm_reply',
      reaction: 'slack_reaction',
      mention: 'slack_mention',
      thread_depth: 'slack_thread_depth',
    };

    const actionId = actionIdMap[slackData.eventType];

    await emitActionEventWithGating(
      {
        userId,
        contactId,
        actionId,
        channel: 'slack',
        metadata: {
          slackMessageId: slackData.slackMessageId,
          threadId: slackData.threadId,
          threadDepth: slackData.threadDepth,
          reactionType: slackData.reactionType,
          channelId: slackData.channelId,
        },
      },
      isPremiumUser
    );
  } catch (error) {
    console.error('Failed to emit Slack event:', error);
  }
}

/**
 * Emit occasion ping event (H1)
 *
 * Called when an occasion reminder is triggered (birthday, work anniversary, etc.)
 * Premium feature - requires calendar/occasion tracking integration
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param isPremiumUser - User's premium status
 * @param occasionData - Occasion metadata
 */
export async function emitOccasionPing(
  userId: string,
  contactId: string,
  isPremiumUser: boolean,
  occasionData: {
    occasionType: 'birthday' | 'work_anniversary' | 'launch' | 'move' | 'custom';
    occasionDate: string;
    occasionTitle?: string;
  }
): Promise<void> {
  try {
    await emitActionEventWithGating(
      {
        userId,
        contactId,
        actionId: 'occasion_ping',
        metadata: {
          occasionType: occasionData.occasionType,
          occasionDate: occasionData.occasionDate,
          occasionTitle: occasionData.occasionTitle,
        },
      },
      isPremiumUser
    );
  } catch (error) {
    console.error('Failed to emit occasion ping:', error);
  }
}

/**
 * Example webhook handler for email tracking (future integration)
 *
 * This would be called by an email service webhook (e.g., SendGrid, Mailgun)
 * when email events are detected.
 */
export async function handleEmailWebhook(
  payload: {
    userId: string;
    contactEmail: string;
    event: 'delivered' | 'opened' | 'replied' | 'bounced' | 'unsubscribed';
    emailId: string;
    timestamp: string;
  },
  getContactByEmail: (userId: string, email: string) => Promise<{ $id: string } | null>,
  isPremiumUser: boolean
): Promise<void> {
  try {
    // Look up contact by email
    const contact = await getContactByEmail(payload.userId, payload.contactEmail);
    if (!contact) {
      console.warn('Contact not found for email webhook:', payload.contactEmail);
      return;
    }

    // Map webhook event to email event type
    const eventTypeMap: Record<typeof payload.event, 'delivered' | 'reply' | 'bounce' | 'unsub'> = {
      delivered: 'delivered',
      opened: 'delivered', // Track as delivered
      replied: 'reply',
      bounced: 'bounce',
      unsubscribed: 'unsub',
    };

    const eventType = eventTypeMap[payload.event];

    await emitEmailEvent(payload.userId, contact.$id, isPremiumUser, {
      eventType,
      emailId: payload.emailId,
    });
  } catch (error) {
    console.error('Failed to handle email webhook:', error);
  }
}
