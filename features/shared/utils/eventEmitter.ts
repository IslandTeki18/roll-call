/**
 * Event Emitter Utility
 *
 * Non-blocking wrapper for emitting action events from UI components.
 * Uses fire-and-forget pattern to avoid blocking user interactions.
 *
 * Usage in components:
 *
 * ```typescript
 * import { emitEvent } from '@/features/shared/utils/eventEmitter';
 *
 * const handleSwipe = () => {
 *   emitEvent({
 *     userId: profile.$id,
 *     contactId: contact.$id,
 *     actionId: 'swipe_ping',
 *   });
 *   // Continue with UI logic without waiting
 * };
 * ```
 */

import {
  emitActionEvent,
  emitActionEventBatch,
  type EmitActionEventParams,
} from '@/features/deck/api/actionEvents.service';

/**
 * Emit a single action event (non-blocking)
 *
 * UI components should use this instead of calling emitActionEvent directly.
 * Errors are logged but don't propagate to the UI.
 *
 * @param params - Event parameters
 */
export function emitEvent(params: EmitActionEventParams): void {
  emitActionEvent(params).catch((err) => {
    console.error('═══ Event Emission Failed ═══');
    console.error('Error:', err);
    console.error('Error message:', err?.message);
    console.error('Error code:', err?.code);
    console.error('Error type:', err?.type);
    console.error('Full error object:', JSON.stringify(err, null, 2));
    console.error('Failed event params:', params);
    console.error('════════════════════════════');
  });
}

/**
 * Emit multiple action events in batch (non-blocking)
 *
 * Useful for multi-contact actions like group notes or introductions.
 *
 * @param events - Array of event parameters
 */
export function emitEventBatch(events: EmitActionEventParams[]): void {
  emitActionEventBatch(events).catch((err) => {
    console.error('Batch emission failed:', err);
    console.error('Failed batch size:', events.length);
  });
}

/**
 * Emit event with conditional logic (non-blocking)
 *
 * Helper for emitting events only when a condition is met.
 *
 * @param condition - Condition to check before emitting
 * @param params - Event parameters
 */
export function emitEventIf(
  condition: boolean,
  params: EmitActionEventParams
): void {
  if (condition) {
    emitEvent(params);
  }
}

/**
 * Emit one of two events based on a condition (non-blocking)
 *
 * Helper for binary choices (e.g., swipe right vs left).
 *
 * @param condition - Condition to check
 * @param ifTrueParams - Event to emit if condition is true
 * @param ifFalseParams - Event to emit if condition is false
 */
export function emitEventEither(
  condition: boolean,
  ifTrueParams: EmitActionEventParams,
  ifFalseParams: EmitActionEventParams
): void {
  emitEvent(condition ? ifTrueParams : ifFalseParams);
}
