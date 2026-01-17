/**
 * System Events Service
 *
 * Calculates and emits system-generated events based on action event history:
 * - H-Category: Occasions & Nudges (fresh_first_touch, fast_first_touch, missed_cadence)
 * - K-Category: Negative Signals (defer_repeats, multi_channel_no_reply)
 * - L-Category: Passive Signals (impression, impressions_no_action)
 *
 * These events are calculated during score recalculation and emitted when thresholds are met.
 */

import { emitActionEvent, getActionEventsByType } from './actionEvents.service';
import type { ActionEvent } from '../types/contactScore.types';
import type { ProfileContact } from '@/features/contacts/api/contacts.service';

/**
 * Check if contact qualifies as "fresh"
 * Fresh = no engagement recorded AND within 14 days of firstSeenAt
 */
function isFreshContact(contact: ProfileContact): boolean {
  if (contact.firstEngagementAt) {
    return false; // Has engagement, not fresh
  }

  if (!contact.firstSeenAt) {
    return false; // No firstSeenAt, can't determine freshness
  }

  const daysSinceFirstSeen = Math.floor(
    (Date.now() - new Date(contact.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceFirstSeen <= 14;
}

/**
 * Calculate days since timestamp
 */
function daysSince(timestamp: string): number {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Check if timestamp is within days
 */
function isWithinDays(timestamp: string, days: number): boolean {
  return daysSince(timestamp) <= days;
}

/**
 * Calculate and emit system events based on action history
 *
 * Called during contact score recalculation (background, non-blocking)
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param contact - Contact object (for freshness check, cadence)
 * @param events - Recent action events (90-day window)
 */
export async function calculateSystemEvents(
  userId: string,
  contactId: string,
  contact: ProfileContact,
  events: ActionEvent[]
): Promise<void> {
  try {
    // H2: fresh_first_touch - New contact engaged within 14 days
    if (isFreshContact(contact)) {
      // Check if there's any meaningful engagement
      const meaningfulActions = events.filter((e) =>
        ['swipe_ping', 'composer_opened', 'call_placed', 'facetime_started', 'send_email', 'send_slack'].includes(
          e.actionId
        )
      );

      if (meaningfulActions.length > 0) {
        // Check if we've already emitted this event
        const existingFreshEvent = events.find(
          (e) => e.actionId === 'fresh_first_touch'
        );

        if (!existingFreshEvent) {
          await emitActionEvent({
            userId,
            contactId,
            actionId: 'fresh_first_touch',
            isFresh: true,
            daysSinceFirstSeen: daysSince(contact.firstSeenAt!),
            metadata: {
              firstSeenAt: contact.firstSeenAt,
              firstEngagementType: meaningfulActions[0].actionId,
            },
          });
        }
      }
    }

    // H3: fast_first_touch - Engaged within 48 hours of discovery
    if (contact.firstSeenAt && !contact.firstEngagementAt) {
      const hoursSinceFirstSeen =
        (Date.now() - new Date(contact.firstSeenAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceFirstSeen <= 48) {
        const meaningfulActions = events.filter((e) =>
          ['swipe_ping', 'composer_opened', 'call_placed', 'facetime_started'].includes(
            e.actionId
          )
        );

        if (meaningfulActions.length > 0) {
          const existingFastEvent = events.find(
            (e) => e.actionId === 'fast_first_touch'
          );

          if (!existingFastEvent) {
            await emitActionEvent({
              userId,
              contactId,
              actionId: 'fast_first_touch',
              isFresh: true,
              daysSinceFirstSeen: 0,
              metadata: {
                hoursSinceFirstSeen: Math.floor(hoursSinceFirstSeen),
                firstEngagementType: meaningfulActions[0].actionId,
              },
            });
          }
        }
      }
    }

    // H4: missed_cadence - Contact overdue by >2× cadence
    if (contact.cadenceDays && contact.cadenceDays > 0) {
      const lastMeaningfulEvent = events.find((e) =>
        ['composer_opened', 'call_placed', 'facetime_started', 'send_email', 'send_slack'].includes(
          e.actionId
        )
      );

      if (lastMeaningfulEvent) {
        const daysSinceLastContact = daysSince(lastMeaningfulEvent.timestamp);
        const overdueThreshold = contact.cadenceDays * 2;

        if (daysSinceLastContact > overdueThreshold) {
          // Check if we've already emitted this event recently (within 7 days)
          const recentMissedCadence = events.find(
            (e) => e.actionId === 'missed_cadence' && isWithinDays(e.timestamp, 7)
          );

          if (!recentMissedCadence) {
            await emitActionEvent({
              userId,
              contactId,
              actionId: 'missed_cadence',
              metadata: {
                cadenceDays: contact.cadenceDays,
                daysSinceLastContact,
                daysOverdue: daysSinceLastContact - contact.cadenceDays,
              },
            });
          }
        }
      }
    }

    // K1: defer_repeats - Deferred ≥3 times in 14 days
    const recentDefers = events.filter(
      (e) => e.actionId === 'swipe_defer' && isWithinDays(e.timestamp, 14)
    );

    if (recentDefers.length >= 3) {
      // Check if we've already emitted this event recently (within 7 days)
      const recentDeferRepeats = events.find(
        (e) => e.actionId === 'defer_repeats' && isWithinDays(e.timestamp, 7)
      );

      if (!recentDeferRepeats) {
        await emitActionEvent({
          userId,
          contactId,
          actionId: 'defer_repeats',
          metadata: {
            deferCount: recentDefers.length,
            timeWindow: '14 days',
          },
        });
      }
    }

    // K2: multi_channel_no_reply - 3 channels, no reply in 30 days
    const recentSends = events.filter(
      (e) =>
        ['composer_opened', 'send_email', 'send_slack', 'call_placed'].includes(e.actionId) &&
        isWithinDays(e.timestamp, 30)
    );

    const channelsUsed = new Set(recentSends.map((e) => e.channel).filter(Boolean));

    if (channelsUsed.size >= 3) {
      // Check if there's any reply
      const hasReply = events.some(
        (e) =>
          ['outcome_replied', 'email_reply', 'slack_dm_reply'].includes(e.actionId) &&
          isWithinDays(e.timestamp, 30)
      );

      if (!hasReply) {
        // Check if we've already emitted this event recently (within 14 days)
        const recentMultiChannelEvent = events.find(
          (e) => e.actionId === 'multi_channel_no_reply' && isWithinDays(e.timestamp, 14)
        );

        if (!recentMultiChannelEvent) {
          await emitActionEvent({
            userId,
            contactId,
            actionId: 'multi_channel_no_reply',
            metadata: {
              channelsUsed: Array.from(channelsUsed),
              attemptCount: recentSends.length,
            },
          });
        }
      }
    }

    // L2: impressions_no_action - ≥3 impressions without action
    const recentImpressions = events.filter(
      (e) => e.actionId === 'impression' && isWithinDays(e.timestamp, 7)
    );

    if (recentImpressions.length >= 3) {
      // Check if there's any meaningful action after impressions
      const hasAction = events.some(
        (e) =>
          ['swipe_ping', 'open_more_context', 'composer_opened'].includes(e.actionId) &&
          isWithinDays(e.timestamp, 7)
      );

      if (!hasAction) {
        // Check if we've already emitted this event recently (within 7 days)
        const recentImpressionsNoAction = events.find(
          (e) => e.actionId === 'impressions_no_action' && isWithinDays(e.timestamp, 7)
        );

        if (!recentImpressionsNoAction) {
          await emitActionEvent({
            userId,
            contactId,
            actionId: 'impressions_no_action',
            metadata: {
              impressionCount: recentImpressions.length,
              timeWindow: '7 days',
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to calculate system events:', error);
    // Don't throw - this is background operation
  }
}

/**
 * Emit impression event (L1)
 * Called when card is surfaced but not opened
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param linkedCardId - Card ID
 * @param metadata - Additional metadata
 */
export async function emitImpressionEvent(
  userId: string,
  contactId: string,
  linkedCardId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await emitActionEvent({
      userId,
      contactId,
      actionId: 'impression',
      linkedCardId,
      metadata: {
        ...metadata,
        impressionType: 'card_surfaced',
      },
    });
  } catch (error) {
    console.error('Failed to emit impression event:', error);
    // Don't throw - this is background operation
  }
}
