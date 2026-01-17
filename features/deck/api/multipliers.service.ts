/**
 * Multipliers Service
 *
 * Calculates point multipliers for action events based on:
 * - Channel depth (call/meet ×1.3, email/slack ×1.15, SMS ×1.0)
 * - Customization level (custom ×1.4, heavy ×1.25, light ×1.1, untouched ×1.0)
 * - Group/intro activity (×1.2)
 * - Freshness boost (+25 points, decays linearly from day 14→21)
 */

import {
  DEFAULT_MULTIPLIERS,
  type CustomizationLevel,
  type ActionEvent,
} from '../types/contactScore.types';

export type ChannelType = 'sms' | 'email' | 'slack' | 'call' | 'facetime';

export interface MultiplierResult {
  channelDepth: number;
  customization: number;
  groupIntro: number;
  freshnessBoost: number;
  totalMultiplier: number;
  appliedMultipliers: Record<string, number>; // For storage in ActionEvent.multipliersApplied
}

/**
 * Get channel depth multiplier
 * call/facetime/meet ×1.3, email/slack ×1.15, SMS ×1.0
 */
export function getChannelMultiplier(channel?: ChannelType): number {
  if (!channel) return 1.0;

  switch (channel) {
    case 'call':
    case 'facetime':
      return DEFAULT_MULTIPLIERS.channelDepth.call;
    case 'email':
      return DEFAULT_MULTIPLIERS.channelDepth.email;
    case 'slack':
      return DEFAULT_MULTIPLIERS.channelDepth.slack;
    case 'sms':
      return DEFAULT_MULTIPLIERS.channelDepth.sms;
    default:
      return 1.0;
  }
}

/**
 * Get customization multiplier
 * custom ×1.4, heavy ×1.25, light ×1.1, untouched ×1.0
 */
export function getCustomizationMultiplier(
  customizationLevel?: CustomizationLevel
): number {
  if (!customizationLevel) return 1.0;

  return DEFAULT_MULTIPLIERS.customization[customizationLevel];
}

/**
 * Get group/intro multiplier
 * Applied when isMultiContact is true (notes/messages with ≥2 contacts)
 */
export function getGroupIntroMultiplier(isMultiContact: boolean): number {
  return isMultiContact ? DEFAULT_MULTIPLIERS.groupIntro : 1.0;
}

/**
 * Calculate freshness boost
 * +25 points if contact is fresh (no engagement, within 14 days of firstSeenAt)
 * Decays linearly from day 14→21
 *
 * @param isFresh - Whether contact qualifies as fresh
 * @param daysSinceFirstSeen - Days since contact was first seen
 * @returns Freshness boost points (0-25)
 */
export function calculateFreshnessBoost(
  isFresh: boolean,
  daysSinceFirstSeen: number
): number {
  if (!isFresh) return 0;

  const { freshnessBoost, freshnessDecayStart, freshnessDecayEnd } =
    DEFAULT_MULTIPLIERS;

  // Full boost within decay start window
  if (daysSinceFirstSeen <= freshnessDecayStart) {
    return freshnessBoost;
  }

  // Linear decay from day 14→21
  if (daysSinceFirstSeen < freshnessDecayEnd) {
    const decayDuration = freshnessDecayEnd - freshnessDecayStart;
    const daysIntoDecay = daysSinceFirstSeen - freshnessDecayStart;
    const decayPercent = daysIntoDecay / decayDuration;
    return freshnessBoost * (1 - decayPercent);
  }

  // No boost after decay end
  return 0;
}

/**
 * Calculate all multipliers for an action event
 *
 * @param params - Action event parameters
 * @returns Multiplier result with breakdown
 */
export function calculateMultipliers(params: {
  channel?: ChannelType;
  customizationLevel?: CustomizationLevel;
  isMultiContact?: boolean;
  isFresh?: boolean;
  daysSinceFirstSeen?: number;
}): MultiplierResult {
  const {
    channel,
    customizationLevel,
    isMultiContact = false,
    isFresh = false,
    daysSinceFirstSeen = 0,
  } = params;

  const channelDepth = getChannelMultiplier(channel);
  const customization = getCustomizationMultiplier(customizationLevel);
  const groupIntro = getGroupIntroMultiplier(isMultiContact);
  const freshnessBoost = calculateFreshnessBoost(isFresh, daysSinceFirstSeen);

  // Total multiplier is product of all multipliers
  const totalMultiplier = channelDepth * customization * groupIntro;

  // Build applied multipliers object (excluding 1.0 values for cleaner storage)
  const appliedMultipliers: Record<string, number> = {};
  if (channelDepth !== 1.0) appliedMultipliers.channelDepth = channelDepth;
  if (customization !== 1.0) appliedMultipliers.customization = customization;
  if (groupIntro !== 1.0) appliedMultipliers.groupIntro = groupIntro;
  if (freshnessBoost > 0) appliedMultipliers.freshnessBoost = freshnessBoost;

  return {
    channelDepth,
    customization,
    groupIntro,
    freshnessBoost,
    totalMultiplier,
    appliedMultipliers,
  };
}

/**
 * Apply multipliers to base points
 *
 * @param basePoints - Base points for the action
 * @param multipliers - Multiplier result
 * @returns Final points after multipliers applied
 */
export function applyMultipliers(
  basePoints: number,
  multipliers: MultiplierResult
): number {
  // First apply multipliers, then add freshness boost
  const multipliedPoints = basePoints * multipliers.totalMultiplier;
  return multipliedPoints + multipliers.freshnessBoost;
}

/**
 * Calculate final points with all multipliers
 * Convenience function combining calculation and application
 *
 * @param basePoints - Base points for the action
 * @param params - Multiplier parameters
 * @returns Final points after all multipliers
 */
export function calculateFinalPoints(
  basePoints: number,
  params: {
    channel?: ChannelType;
    customizationLevel?: CustomizationLevel;
    isMultiContact?: boolean;
    isFresh?: boolean;
    daysSinceFirstSeen?: number;
  }
): { finalPoints: number; multipliers: MultiplierResult } {
  const multipliers = calculateMultipliers(params);
  const finalPoints = applyMultipliers(basePoints, multipliers);

  return { finalPoints, multipliers };
}
