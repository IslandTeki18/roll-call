export interface RHSFactors {
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
  engagementQualityBonus: number;
  conversationDepthBonus: number;
  decayPenalty: number;
  totalScore: number;

  daysSinceLastEngagement: number | null;
  totalEngagements: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  averageEngagementFrequency: number;
  isOverdueByCadence: boolean;
  daysOverdue: number;
}

export interface RHSConfig {
  recencyExcellent: number;
  recencyGood: number;
  recencyFair: number;
  recencyPoor: number;
  freshnessWindow: number;
  freshnessDecayStart: number;
  freshnessDecayEnd: number;
  fatigueWindowDays: number;
  cadenceOverdueMultiplier: number;
  cadenceEarlyMultiplier: number;
  maxRecencyScore: number;
  maxCadenceBoost: number;
  maxCadencePenalty: number;
  maxFreshnessBoost: number;
  maxEngagementQualityBonus: number;
  maxConversationDepthBonus: number;
  maxFatiguePenalty: number;

  // NEW: Decay configuration
  decayStartDays: number; // Days after which decay begins
  decayMaxPenalty: number; // Maximum penalty from decay
  decayExponentialRate: number; // Rate of exponential decay
}

export const DEFAULT_RHS_CONFIG: RHSConfig = {
  recencyExcellent: 7,
  recencyGood: 14,
  recencyFair: 21,
  recencyPoor: 30,
  freshnessWindow: 14,
  freshnessDecayStart: 14,
  freshnessDecayEnd: 21,
  fatigueWindowDays: 3,
  cadenceOverdueMultiplier: 1.5,
  cadenceEarlyMultiplier: 0.5,
  maxRecencyScore: 100,
  maxCadenceBoost: 30,
  maxCadencePenalty: 15,
  maxFreshnessBoost: 25,
  maxEngagementQualityBonus: 20,
  maxConversationDepthBonus: 15,
  maxFatiguePenalty: 20,

  decayStartDays: 30,
  decayMaxPenalty: 40,
  decayExponentialRate: 0.05,
};
