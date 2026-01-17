/**
 * Profile Events Service
 *
 * Handlers for J-category profile and data hygiene events:
 * - J1: profile_update (email, phone, title, company changes)
 * - J2: set_pref (channel/time preferences)
 * - J3: set_city (location updates)
 * - J4: set_dnc (Do Not Contact flag)
 *
 * These handlers track when users maintain and update contact data,
 * which indicates relationship engagement and data quality.
 */

import { emitActionEvent } from './actionEvents.service';
import type { ProfileContact } from '@/features/contacts/api/contacts.service';

/**
 * Emit profile update event (J1)
 *
 * Called when contact profile fields are updated (email, phone, title, company, etc.)
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param updates - Fields that were updated
 */
export async function emitProfileUpdateEvent(
  userId: string,
  contactId: string,
  updates: Partial<{
    firstName: string;
    lastName: string;
    phoneNumbers: string;
    emails: string;
    jobTitle: string;
    organization: string;
    notes: string;
  }>
): Promise<void> {
  try {
    // Only emit if meaningful fields were updated
    const meaningfulFields = ['phoneNumbers', 'emails', 'jobTitle', 'organization'];
    const fieldsChanged = Object.keys(updates).filter((key) =>
      meaningfulFields.includes(key)
    );

    if (fieldsChanged.length === 0) {
      return; // No meaningful updates
    }

    await emitActionEvent({
      userId,
      contactId,
      actionId: 'profile_update',
      metadata: {
        fieldsChanged,
        updateCount: fieldsChanged.length,
      },
    });
  } catch (error) {
    console.error('Failed to emit profile update event:', error);
  }
}

/**
 * Emit preference update event (J2)
 *
 * Called when contact preferences are set (channel, time of day, etc.)
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param preferences - Preference updates
 */
export async function emitPreferenceUpdateEvent(
  userId: string,
  contactId: string,
  preferences: {
    preferredChannel?: 'sms' | 'email' | 'call' | 'slack';
    preferredTime?: 'morning' | 'afternoon' | 'evening';
    cadenceDays?: number;
  }
): Promise<void> {
  try {
    await emitActionEvent({
      userId,
      contactId,
      actionId: 'set_pref',
      metadata: {
        preferences,
        preferenceType: Object.keys(preferences),
      },
    });
  } catch (error) {
    console.error('Failed to emit preference update event:', error);
  }
}

/**
 * Emit city/location update event (J3)
 *
 * Called when contact's location/city is updated
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param location - Location data
 */
export async function emitLocationUpdateEvent(
  userId: string,
  contactId: string,
  location: {
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  }
): Promise<void> {
  try {
    await emitActionEvent({
      userId,
      contactId,
      actionId: 'set_city',
      metadata: {
        ...location,
      },
    });
  } catch (error) {
    console.error('Failed to emit location update event:', error);
  }
}

/**
 * Emit Do Not Contact event (J4)
 *
 * Called when contact is marked as Do Not Contact (archived permanently)
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param reason - Optional reason for marking DNC
 */
export async function emitDoNotContactEvent(
  userId: string,
  contactId: string,
  reason?: string
): Promise<void> {
  try {
    await emitActionEvent({
      userId,
      contactId,
      actionId: 'set_dnc',
      metadata: {
        reason,
        markedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to emit DNC event:', error);
  }
}

/**
 * Helper: Detect which fields changed in a contact update
 *
 * @param oldContact - Previous contact state
 * @param newContact - Updated contact state
 * @returns Object with changed fields
 */
export function detectContactChanges(
  oldContact: Partial<ProfileContact>,
  newContact: Partial<ProfileContact>
): Partial<ProfileContact> {
  const changes: Partial<ProfileContact> = {};

  const fieldsToCheck: Array<keyof ProfileContact> = [
    'firstName',
    'lastName',
    'phoneNumbers',
    'emails',
    'jobTitle',
    'organization',
    'notes',
  ];

  fieldsToCheck.forEach((field) => {
    if (oldContact[field] !== newContact[field]) {
      changes[field] = newContact[field];
    }
  });

  return changes;
}

/**
 * Full contact update handler with automatic event detection
 *
 * Call this when updating a contact to automatically emit appropriate events.
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param oldContact - Previous contact state
 * @param newContact - Updated contact state
 */
export async function handleContactUpdate(
  userId: string,
  contactId: string,
  oldContact: Partial<ProfileContact>,
  newContact: Partial<ProfileContact>
): Promise<void> {
  try {
    const changes = detectContactChanges(oldContact, newContact);

    // J1: Profile update
    if (Object.keys(changes).length > 0) {
      await emitProfileUpdateEvent(userId, contactId, changes);
    }

    // J3: City update (if location-related fields changed)
    // Note: ProfileContact doesn't have city field yet, but handler is ready
    // When city/location fields are added to ProfileContact, this will work automatically
  } catch (error) {
    console.error('Failed to handle contact update:', error);
  }
}
