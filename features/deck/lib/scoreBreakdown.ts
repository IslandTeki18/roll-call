/**
 * Score Breakdown Utilities
 *
 * Analyzes action events and breaks down Contact Score into categories:
 * - Intent Points (A-category: deck actions)
 * - Interaction Points (B+C categories: compose, send, outcomes)
 * - Reciprocity Points (outcome_replied, email_reply, etc.)
 * - Context Points (D-category: notes)
 * - Cadence Points (H-category: occasions, nudges)
 * - Freshness Points (fresh_first_touch, fast_first_touch)
 */

import type { ActionEvent, ActionId, ScoreBreakdown } from '../types/contactScore.types';

/**
 * Category mappings for score breakdown
 */
const CATEGORY_MAPPINGS = {
  intent: [
    'card_view',
    'swipe_ping',
    'swipe_defer',
    'swipe_archive',
    'open_more_context',
    'pick_suggested_channel',
  ] as ActionId[],

  interaction: [
    'draft_ai_untouched',
    'draft_ai_light',
    'draft_ai_heavy',
    'draft_custom',
    'attach_artifact',
    'choose_cta',
    'composer_opened',
    'send_email',
    'send_slack',
    'call_placed',
    'facetime_started',
  ] as ActionId[],

  reciprocity: [
    'outcome_replied',
    'email_reply',
    'email_reply_fast',
    'slack_dm_reply',
    'email_thread_depth',
    'slack_thread_depth',
  ] as ActionId[],

  context: [
    'note_manual',
    'note_group',
    'note_pin',
    'note_tag',
    'note_voice',
    'note_edit',
    'accept_suggestion',
    'reject_suggestion',
  ] as ActionId[],

  cadence: [
    'occasion_ping',
    'fresh_first_touch',
    'fast_first_touch',
    'missed_cadence',
  ] as ActionId[],

  freshness: ['fresh_first_touch', 'fast_first_touch'] as ActionId[],
};

/**
 * Calculate score breakdown from action events
 *
 * @param events - Array of action events (within 90-day window)
 * @returns Score breakdown with category totals and metadata
 */
export function calculateScoreBreakdown(events: ActionEvent[]): ScoreBreakdown {
  // Initialize breakdown
  let intentPoints = 0;
  let interactionPoints = 0;
  let reciprocityPoints = 0;
  let contextPoints = 0;
  let cadencePoints = 0;
  let freshnessPoints = 0;

  // Calculate base score (sum of all finalPoints)
  let baseScore = 0;
  let multiplierBonus = 0;

  events.forEach((event) => {
    const { actionId, basePoints, finalPoints } = event;

    baseScore += basePoints;
    multiplierBonus += finalPoints - basePoints; // Bonus from multipliers

    // Categorize points
    if (CATEGORY_MAPPINGS.intent.includes(actionId)) {
      intentPoints += finalPoints;
    }
    if (CATEGORY_MAPPINGS.interaction.includes(actionId)) {
      interactionPoints += finalPoints;
    }
    if (CATEGORY_MAPPINGS.reciprocity.includes(actionId)) {
      reciprocityPoints += finalPoints;
    }
    if (CATEGORY_MAPPINGS.context.includes(actionId)) {
      contextPoints += finalPoints;
    }
    if (CATEGORY_MAPPINGS.cadence.includes(actionId)) {
      cadencePoints += finalPoints;
    }
    if (CATEGORY_MAPPINGS.freshness.includes(actionId)) {
      freshnessPoints += finalPoints;
    }
  });

  // Get recent actions (last 10)
  const recentActions = events.slice(0, 10);

  // Calculate top channels
  const channelCounts = new Map<
    string,
    { count: number; points: number }
  >();

  events.forEach((event) => {
    if (event.channel) {
      const existing = channelCounts.get(event.channel) || { count: 0, points: 0 };
      channelCounts.set(event.channel, {
        count: existing.count + 1,
        points: existing.points + event.finalPoints,
      });
    }
  });

  const topChannels = Array.from(channelCounts.entries())
    .map(([channel, data]) => ({
      channel,
      count: data.count,
      points: data.points,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5); // Top 5 channels

  return {
    baseScore,
    multiplierBonus,
    decayPenalty: 0, // Will be calculated in contactScore.service
    finalScore: 0, // Will be set in contactScore.service

    // Category breakdowns
    intentPoints,
    interactionPoints,
    reciprocityPoints,
    contextPoints,
    cadencePoints,
    freshnessPoints,

    // Metadata
    recentActions,
    topChannels,
  };
}

/**
 * Get category label for an action ID
 *
 * @param actionId - Action ID
 * @returns Category label (Intent, Interaction, etc.)
 */
export function getActionCategory(actionId: ActionId): string {
  for (const [category, actionIds] of Object.entries(CATEGORY_MAPPINGS)) {
    if (actionIds.includes(actionId)) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  return 'Other';
}

/**
 * Calculate peak score from events
 * Peak = highest cumulative score achieved in the 90-day window
 *
 * @param events - Array of action events (sorted by timestamp desc)
 * @returns Peak score value
 */
export function calculatePeakScore(events: ActionEvent[]): number {
  if (events.length === 0) return 0;

  // Sort events chronologically (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let runningScore = 0;
  let peakScore = 0;

  sortedEvents.forEach((event) => {
    runningScore += event.finalPoints;
    if (runningScore > peakScore) {
      peakScore = runningScore;
    }
  });

  return Math.min(100, Math.max(0, peakScore)); // Clamp to 0-100
}
