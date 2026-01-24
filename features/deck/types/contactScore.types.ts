/**
 * Contact Score System Type Definitions
 *
 * This file contains all TypeScript types and constants for the new Contact Score system,
 * which replaces the RHS (Relationship Health Score) system.
 *
 * Contact Score = (Intent + Interaction Quality + Reciprocity + Context Richness + Cadence Fit + Fresh) × Multipliers − Penalties
 * Default scale: 0–100 per 90-day window
 */

// ============================================================================
// Action Taxonomy - 60+ distinct user actions across 11 categories
// ============================================================================

export type ActionId =
  // A) Deck & Intent (pre-send)
  | 'card_view'
  | 'swipe_ping'
  | 'swipe_defer'
  | 'swipe_archive'
  | 'open_more_context'
  | 'pick_suggested_channel'

  // B) Compose & Message Creation
  | 'draft_ai_untouched'
  | 'draft_ai_light' // <20% chars edited
  | 'draft_ai_heavy' // ≥20% chars edited
  | 'draft_custom'
  | 'attach_artifact'
  | 'choose_cta'
  | 'generate_ai_draft' // Tapped "Generate with AI" button
  | 'copy_suggested_draft' // Tapped suggested box to copy

  // C) Send & Immediate Outcomes
  | 'composer_opened' // SMS/iMessage composer opened
  | 'send_email' // Premium: API confirmed
  | 'send_slack' // Premium: API confirmed
  | 'call_placed'
  | 'facetime_started'
  | 'outcome_sent'
  | 'outcome_vm'
  | 'outcome_scheduled'
  | 'outcome_replied'
  | 'outcome_no_answer'

  // D) Notes & Context (manual + auto)
  | 'note_manual'
  | 'note_group' // Multi-contact note
  | 'note_pin'
  | 'note_tag'
  | 'note_voice'
  | 'note_edit'
  | 'accept_suggestion'
  | 'reject_suggestion'

  // E) Calendar & Meetings (Premium, via Google/MS)
  | 'meeting_1to1'
  | 'meeting_short' // <15m
  | 'meeting_group' // >3 attendees
  | 'meeting_keyword' // pitch/interview/demo detected
  | 'event_created'

  // F) Email-specific Signals (Premium)
  | 'email_delivered'
  | 'email_reply'
  | 'email_reply_fast' // <24h
  | 'email_thread_depth' // ≥3 back-and-forth
  | 'email_link_click' // Optional tracking
  | 'email_bounce'
  | 'email_unsub'

  // G) Slack-specific Signals (Premium)
  | 'slack_dm_sent'
  | 'slack_dm_reply'
  | 'slack_reaction'
  | 'slack_mention'
  | 'slack_thread_depth' // ≥3

  // H) Occasions & System Nudges
  | 'occasion_ping' // Birthday/work anniversary
  | 'fresh_first_touch'
  | 'fast_first_touch' // ≤48h
  | 'missed_cadence' // >2× overdue

  // I) Contact Graph & Introductions
  | 'intro_create' // A → B
  | 'intro_thanks' // Thank-you to introducer
  | 'intro_hub' // Multiple intros by same contact

  // J) Data Hygiene / Profile Updates
  | 'profile_update' // email/phone/title/company
  | 'set_pref' // channel/time preference
  | 'set_city'
  | 'set_dnc' // Do Not Contact

  // K) Negative/Adverse Signals
  | 'defer_repeats' // ≥3 within 14d
  | 'multi_channel_no_reply' // 3 channels, 30d
  | 'mark_not_relevant'

  // L) Passive/Exposure Signals
  | 'impression' // Card surfaced but not opened
  | 'impressions_no_action' // ≥3 impressions
  | 'quiet_window_send'; // Sent in preferred window

// ============================================================================
// Base Point Values for Each Action
// ============================================================================

export const BASE_POINTS: Record<ActionId, number> = {
  // A) Deck & Intent
  card_view: 0.5,
  swipe_ping: 2,
  swipe_defer: 0.5,
  swipe_archive: -1,
  open_more_context: 1,
  pick_suggested_channel: 1,

  // B) Compose & Message Creation
  draft_ai_untouched: 2,
  draft_ai_light: 3,
  draft_ai_heavy: 5,
  draft_custom: 7,
  attach_artifact: 2,
  choose_cta: 2,
  generate_ai_draft: 1,
  copy_suggested_draft: 2,

  // C) Send & Immediate Outcomes
  composer_opened: 1,
  send_email: 4,
  send_slack: 3,
  call_placed: 2,
  facetime_started: 2,
  outcome_sent: 1,
  outcome_vm: 1,
  outcome_scheduled: 6,
  outcome_replied: 10,
  outcome_no_answer: -0.5,

  // D) Notes & Context
  note_manual: 3,
  note_group: 5,
  note_pin: 1,
  note_tag: 1,
  note_voice: 4,
  note_edit: 1,
  accept_suggestion: 2,
  reject_suggestion: 0.5,

  // E) Calendar & Meetings (Premium)
  meeting_1to1: 12,
  meeting_short: 6,
  meeting_group: 6,
  meeting_keyword: 3,
  event_created: 4,

  // F) Email-specific (Premium)
  email_delivered: 1,
  email_reply: 10,
  email_reply_fast: 3,
  email_thread_depth: 4,
  email_link_click: 2,
  email_bounce: -6,
  email_unsub: -12,

  // G) Slack-specific (Premium)
  slack_dm_sent: 3,
  slack_dm_reply: 8,
  slack_reaction: 2,
  slack_mention: 4,
  slack_thread_depth: 3,

  // H) Occasions & System Nudges
  occasion_ping: 4,
  fresh_first_touch: 8,
  fast_first_touch: 4,
  missed_cadence: -3,

  // I) Contact Graph & Introductions
  intro_create: 8,
  intro_thanks: 4,
  intro_hub: 3,

  // J) Data Hygiene / Profile Updates
  profile_update: 2,
  set_pref: 2,
  set_city: 1,
  set_dnc: -8,

  // K) Negative/Adverse Signals
  defer_repeats: -2,
  multi_channel_no_reply: -5,
  mark_not_relevant: -6,

  // L) Passive/Exposure Signals
  impression: 0.2,
  impressions_no_action: -1,
  quiet_window_send: 1,
};

// ============================================================================
// Multipliers
// ============================================================================

export interface MultiplierConfig {
  // Channel depth: call/meet ×1.3, email/slack ×1.15, SMS ×1.0, deeplink ×0.9
  channelDepth: Record<'call' | 'meet' | 'email' | 'slack' | 'sms' | 'deeplink', number>;

  // Customization: untouched ×1.0, light ×1.1, heavy ×1.25, custom ×1.4
  customization: Record<'untouched' | 'light' | 'heavy' | 'custom', number>;

  // Group/Intro: notes/messages referencing ≥2 contacts ×1.2
  groupIntro: number;

  // Freshness: if isFresh true, +25 pre-add then decay linearly over days 14→21
  freshnessBoost: number;
  freshnessDecayStart: number;
  freshnessDecayEnd: number;
}

export const DEFAULT_MULTIPLIERS: MultiplierConfig = {
  channelDepth: {
    call: 1.3,
    meet: 1.3,
    email: 1.15,
    slack: 1.15,
    sms: 1.0,
    deeplink: 0.9,
  },
  customization: {
    untouched: 1.0,
    light: 1.1,
    heavy: 1.25,
    custom: 1.4,
  },
  groupIntro: 1.2,
  freshnessBoost: 25,
  freshnessDecayStart: 14,
  freshnessDecayEnd: 21,
};

// ============================================================================
// Scoring Configuration
// ============================================================================

export interface ContactScoreConfig {
  // Score scale and window
  maxScore: number; // Target max: 100
  rollingWindowDays: number; // 90-day window

  // Fatigue and anti-gaming
  fatigueWindowHours: number; // 48h rolling window
  fatigueMaxPoints: number; // Max +12 pts per 48h per contact

  // Diversity penalty: same channel back-to-back reduces multiplier
  diversityPenaltyAmount: number; // -0.1 per repeat
  diversityPenaltyMin: number; // Min multiplier: 0.8

  // Time decay
  decayStartDay: number; // Start decay on day 14
  decayRatePerDay: number; // 1% per day
  decayFloorPercent: number; // Floor at 25% of peak

  // Multiplier config
  multipliers: MultiplierConfig;
}

export const DEFAULT_CONTACT_SCORE_CONFIG: ContactScoreConfig = {
  maxScore: 100,
  rollingWindowDays: 90,
  fatigueWindowHours: 48,
  fatigueMaxPoints: 12,
  diversityPenaltyAmount: 0.1,
  diversityPenaltyMin: 0.8,
  decayStartDay: 14,
  decayRatePerDay: 0.01, // 1%
  decayFloorPercent: 0.25, // 25%
  multipliers: DEFAULT_MULTIPLIERS,
};

// ============================================================================
// Context Token Types
// ============================================================================

export type TokenType =
  | 'people' // Names/handles mapped to contact IDs
  | 'company' // Company names + domains
  | 'topic' // Keywords (fundraise, hiring, Jiu-Jitsu, etc.)
  | 'occasion' // Birthday, anniversary, launch, move
  | 'location' // City, venue
  | 'preference' // Channel, time-of-day, meeting type
  | 'commitment' // Promises with due dates
  | 'referral' // Intro/referral relationship edges
  | 'sentiment' // pos|neutral|neg + confidence
  | 'artifact' // Links, attachments, calendar event IDs
  | 'cadence_hint'; // Extracted cadence preferences

export interface ContextToken {
  $id: string;
  contactId: string;
  tokenType: TokenType;
  tokenValue: string; // The actual token (name, keyword, etc.)
  confidence: number; // 0-1 confidence score from NLP extraction
  sourceActionId: string; // Which action event generated this token
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (90 days from creation)
  metadata: string; // JSON string for additional data
}

// ============================================================================
// Action Event
// ============================================================================

export interface ActionEvent {
  $id: string;
  userId: string;
  contactId: string; // Primary contact (for multi-contact, store separately)
  actionId: ActionId;
  timestamp: string; // ISO timestamp

  // Point calculation
  basePoints: number; // Points before multipliers
  multipliersApplied: string; // JSON: { channelDepth: 1.3, customization: 1.1 }
  finalPoints: number; // Points after multipliers

  // Context
  channel?: 'sms' | 'email' | 'slack' | 'call' | 'facetime'; // For channel-related actions
  customizationLevel?: 'untouched' | 'light' | 'heavy' | 'custom'; // For draft actions
  isMultiContact: boolean; // For group notes/intros
  linkedCardId?: string; // For deck-related actions

  // Metadata
  metadata: string; // JSON string for action-specific data
}

// ============================================================================
// Contact Score Record
// ============================================================================

export interface ContactScore {
  $id: string;
  userId: string;
  contactId: string;

  // Current score
  currentScore: number; // After decay applied
  peakScore: number; // Highest score achieved in 90d window

  // Timing
  lastActionTimestamp: string; // ISO timestamp of most recent action
  lastUpdated: string; // ISO timestamp of last score recalculation
  decayStartedAt: string | null; // ISO timestamp when decay began (day 14)

  // Metadata
  totalActions: number; // Count of all actions in 90d window
  positiveActions: number; // Actions with positive points
  negativeActions: number; // Actions with negative points
}

// ============================================================================
// Premium Action Types (for gating)
// ============================================================================

export const PREMIUM_ACTIONS: ActionId[] = [
  // E) Calendar & Meetings
  'meeting_1to1',
  'meeting_short',
  'meeting_group',
  'meeting_keyword',
  'event_created',

  // F) Email-specific
  'email_delivered',
  'email_reply',
  'email_reply_fast',
  'email_thread_depth',
  'email_link_click',
  'email_bounce',
  'email_unsub',

  // G) Slack-specific
  'slack_dm_sent',
  'slack_dm_reply',
  'slack_reaction',
  'slack_mention',
  'slack_thread_depth',

  // H) Occasions (premium ingestion)
  'occasion_ping',
];

// ============================================================================
// Utility Types
// ============================================================================

export interface ScoreBreakdown {
  baseScore: number; // Sum of base points
  multiplierBonus: number; // Extra points from multipliers
  decayPenalty: number; // Points lost to decay
  finalScore: number; // currentScore

  // Category breakdowns
  intentPoints: number; // A-category actions
  interactionPoints: number; // B + C categories
  reciprocityPoints: number; // outcome_replied, etc.
  contextPoints: number; // D-category (notes)
  cadencePoints: number; // H-category
  freshnessPoints: number; // fresh_first_touch

  // Recent activity
  recentActions: ActionEvent[]; // Last 10 actions
  topChannels: Array<{ channel: string; count: number; points: number }>;
}

export interface TokenStats {
  totalTokens: number;
  tokensByType: Record<TokenType, number>;
  recentTokens: ContextToken[]; // Last 10 tokens
  isAtCap: boolean; // True if at 50 token limit
}
