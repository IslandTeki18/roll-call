/**
 * Action Events Service
 *
 * Handles emission, storage, and querying of action events for the Contact Score system.
 * This service runs in parallel with the legacy engagement.service.ts during the migration period.
 *
 * Key Features:
 * - Non-blocking event emission (fire-and-forget pattern)
 * - Point calculation with multipliers
 * - Premium gating for E/F/G categories
 * - Async error handling (logs but doesn't throw)
 */

import { ID, Query } from 'react-native-appwrite';
import { tablesDB } from '@/features/shared/lib/appwrite';
import {
  type ActionId,
  type ActionEvent,
  BASE_POINTS,
  PREMIUM_ACTIONS,
} from '../types/contactScore.types';
import { calculateFinalPoints, type ChannelType } from './multipliers.service';
import type { CustomizationLevel } from './editDistance.service';
import { recalculateContactScoreBackground } from './contactScore.service';

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const ACTION_EVENTS_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID!;

export interface EmitActionEventParams {
  userId: string;
  contactId: string;
  actionId: ActionId;
  linkedCardId?: string;
  channel?: ChannelType;
  customizationLevel?: CustomizationLevel;
  isMultiContact?: boolean;
  isFresh?: boolean;
  daysSinceFirstSeen?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Emit an action event
 *
 * Calculates points with multipliers, inserts to Appwrite, and triggers background score recalculation.
 * Runs async with error handling to avoid blocking UI.
 *
 * @param params - Event parameters
 * @returns Promise that resolves to the created event (but UI should not await this)
 */
export async function emitActionEvent(
  params: EmitActionEventParams
): Promise<ActionEvent> {
  const {
    userId,
    contactId,
    actionId,
    linkedCardId,
    channel,
    customizationLevel,
    isMultiContact = false,
    isFresh = false,
    daysSinceFirstSeen = 0,
    metadata = {},
  } = params;

  // Get base points for this action
  const basePoints = BASE_POINTS[actionId];

  // Calculate multipliers and final points
  const { finalPoints, multipliers } = calculateFinalPoints(basePoints, {
    channel,
    customizationLevel,
    isMultiContact,
    isFresh,
    daysSinceFirstSeen,
  });

  // Create timestamp
  const timestamp = new Date().toISOString();

  // Prepare data for Appwrite
  const data = {
    userId,
    contactId,
    actionId,
    timestamp,
    basePoints,
    multipliersApplied: JSON.stringify(multipliers.appliedMultipliers),
    finalPoints,
    channel: channel || '',
    customizationLevel: customizationLevel || '',
    isMultiContact,
    linkedCardId: linkedCardId || '',
    metadata: JSON.stringify(metadata),
    createdAt: timestamp,
  };

  try {
    // Insert to Appwrite
    const event = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      rowId: ID.unique(),
      data,
    });

    // Trigger background score recalculation (non-blocking)
    recalculateContactScoreBackground(userId, contactId).catch((err) =>
      console.error('Score recalculation failed:', err)
    );

    return event as unknown as ActionEvent;
  } catch (error) {
    console.error('Failed to emit action event:', error);
    console.error('Event data:', data);
    throw error;
  }
}

/**
 * Check if user has premium access for this action
 * Used for gating E/F/G category events
 *
 * @param actionId - Action to check
 * @param isPremiumUser - User's premium status
 * @returns True if user can emit this event
 */
export function canEmitPremiumAction(
  actionId: ActionId,
  isPremiumUser: boolean
): boolean {
  if (!PREMIUM_ACTIONS.includes(actionId)) {
    return true; // Non-premium action, always allowed
  }
  return isPremiumUser;
}

/**
 * Emit action event with premium gating
 *
 * @param params - Event parameters
 * @param isPremiumUser - User's premium status
 * @returns Promise that resolves to the created event, or null if gated
 */
export async function emitActionEventWithGating(
  params: EmitActionEventParams,
  isPremiumUser: boolean
): Promise<ActionEvent | null> {
  if (!canEmitPremiumAction(params.actionId, isPremiumUser)) {
    console.warn(
      `Action ${params.actionId} requires premium subscription. Skipping event emission.`
    );
    return null;
  }

  return emitActionEvent(params);
}

/**
 * Get action events for a specific contact
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param limit - Maximum number of events to return
 * @returns Array of action events
 */
export async function getActionEventsByContact(
  userId: string,
  contactId: string,
  limit: number = 100
): Promise<ActionEvent[]> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.equal('contactId', contactId),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ],
    });

    return response.rows as unknown as ActionEvent[];
  } catch (error) {
    console.error('Failed to get action events by contact:', error);
    return [];
  }
}

/**
 * Get action events within a date range
 *
 * Used for 90-day rolling window calculations
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param startDate - ISO timestamp
 * @param endDate - ISO timestamp
 * @param limit - Maximum number of events to return
 * @returns Array of action events
 */
export async function getActionEventsByContactAndDateRange(
  userId: string,
  contactId: string,
  startDate: string,
  endDate: string,
  limit: number = 1000
): Promise<ActionEvent[]> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.equal('contactId', contactId),
        Query.greaterThanEqual('timestamp', startDate),
        Query.lessThanEqual('timestamp', endDate),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ],
    });

    return response.rows as unknown as ActionEvent[];
  } catch (error) {
    console.error('Failed to get action events by date range:', error);
    return [];
  }
}

/**
 * Get action events by type
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param actionId - Action type to filter by
 * @param limit - Maximum number of events to return
 * @returns Array of action events
 */
export async function getActionEventsByType(
  userId: string,
  contactId: string,
  actionId: ActionId,
  limit: number = 100
): Promise<ActionEvent[]> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.equal('contactId', contactId),
        Query.equal('actionId', actionId),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ],
    });

    return response.rows as unknown as ActionEvent[];
  } catch (error) {
    console.error('Failed to get action events by type:', error);
    return [];
  }
}

/**
 * Get recent action events across all contacts
 *
 * @param userId - User ID
 * @param limit - Maximum number of events to return
 * @returns Array of action events
 */
export async function getRecentActionEvents(
  userId: string,
  limit: number = 100
): Promise<ActionEvent[]> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ],
    });

    return response.rows as unknown as ActionEvent[];
  } catch (error) {
    console.error('Failed to get recent action events:', error);
    return [];
  }
}

/**
 * Get last action event for a contact
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @returns Most recent action event, or null if none exist
 */
export async function getLastActionEvent(
  userId: string,
  contactId: string
): Promise<ActionEvent | null> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ACTION_EVENTS_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.equal('contactId', contactId),
        Query.orderDesc('timestamp'),
        Query.limit(1),
      ],
    });

    return response.rows.length > 0
      ? (response.rows[0] as unknown as ActionEvent)
      : null;
  } catch (error) {
    console.error('Failed to get last action event:', error);
    return null;
  }
}

/**
 * Batch emit multiple action events
 * Useful for multi-contact actions (group notes, intros)
 *
 * @param events - Array of event parameters
 * @returns Promise that resolves when all events are emitted
 */
export async function emitActionEventBatch(
  events: EmitActionEventParams[]
): Promise<void> {
  try {
    await Promise.all(events.map((event) => emitActionEvent(event)));
  } catch (error) {
    console.error('Failed to batch emit action events:', error);
  }
}
