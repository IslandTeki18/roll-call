import {
  Contact,
  FreshConnection,
  DeckCard,
  RHSFactors,
  UserPreferences,
} from "../model/deck.types";

export class CardOrderingService {
  private static readonly FRESH_WINDOW_DAYS = 14;
  private static readonly FRESH_BOOST_MAX = 25;
  private static readonly FRESH_DECAY_DAYS = 21;

  /**
   * Calculate Recency-Health-Score (RHS) for a contact
   */
  static calculateRHS(contact: Contact, factors: RHSFactors): number {
    const {
      recencyDecay,
      cadenceFit,
      tagPriority,
      manualMutuality,
      fatigueGuard,
      freshBoost,
    } = factors;

    // Base score starts at 50
    let score = 50;

    // Apply each factor
    score += recencyDecay * 0.3; // 30% weight
    score += cadenceFit * 0.25; // 25% weight
    score += tagPriority * 0.15; // 15% weight
    score += manualMutuality * 0.15; // 15% weight
    score += freshBoost * 0.15; // 15% weight (Fresh connections)

    // Apply fatigue guard (can reduce score)
    score *= fatigueGuard;

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate recency decay factor based on last interaction
   */
  static calculateRecencyDecay(contact: Contact): number {
    if (!contact.lastInteraction) {
      return -20; // No interactions penalty
    }

    const daysSinceLastInteraction = this.daysBetween(
      contact.lastInteraction,
      new Date()
    );

    // Exponential decay: fresher interactions get higher scores
    if (daysSinceLastInteraction <= 7) return 20;
    if (daysSinceLastInteraction <= 14) return 10;
    if (daysSinceLastInteraction <= 30) return 0;
    if (daysSinceLastInteraction <= 60) return -10;
    return -20;
  }

  /**
   * Calculate cadence fit - how well this contact aligns with their preferred cadence
   */
  static calculateCadenceFit(contact: Contact): number {
    if (!contact.cadencePreference || !contact.lastInteraction) {
      return 0; // Neutral if no preference or interaction history
    }

    const daysSinceLastInteraction = this.daysBetween(
      contact.lastInteraction,
      new Date()
    );

    const idealDays = this.getCadenceDays(contact.cadencePreference);
    const deviation = Math.abs(daysSinceLastInteraction - idealDays);

    // Perfect fit gets +15, deviation reduces score
    if (deviation <= 2) return 15;
    if (deviation <= 7) return 10;
    if (deviation <= 14) return 5;
    return -5;
  }

  /**
   * Calculate tag priority boost
   */
  static calculateTagPriority(contact: Contact): number {
    if (!contact.tags?.length) return 0;

    // High priority tags
    const highPriorityTags = ["vip", "investor", "client", "family"];
    const mediumPriorityTags = ["colleague", "friend", "mentor"];

    if (
      contact.tags.some((tag) => highPriorityTags.includes(tag.toLowerCase()))
    ) {
      return 15;
    }
    if (
      contact.tags.some((tag) => mediumPriorityTags.includes(tag.toLowerCase()))
    ) {
      return 8;
    }

    return 0;
  }

  /**
   * Calculate manual mutuality score
   */
  static calculateManualMutuality(contact: Contact): number {
    return contact.mutualityScore || 0;
  }

  static calculateFatigueGuard(contact: Contact): number {
    if (!contact.lastInteraction) return 1.0;

    const daysSinceLastInteraction = this.daysBetween(
      contact.lastInteraction,
      new Date()
    );

    if (daysSinceLastInteraction <= 1) return 0.3;
    if (daysSinceLastInteraction <= 3) return 0.7;
    if (daysSinceLastInteraction <= 7) return 0.9;

    return 1.0;
  }

  /**
   * Calculate Fresh boost for new connections
   */
  static calculateFreshBoost(contact: Contact | FreshConnection): number {
    const daysSinceFirstSeen = this.daysBetween(contact.firstSeen, new Date());

    // Only apply Fresh boost if within window and no interactions
    if (
      daysSinceFirstSeen > this.FRESH_WINDOW_DAYS ||
      contact.lastInteraction
    ) {
      return 0;
    }

    // +25 decaying to 0 by day 21
    const decayFactor = Math.max(
      0,
      1 - daysSinceFirstSeen / this.FRESH_DECAY_DAYS
    );
    return this.FRESH_BOOST_MAX * decayFactor;
  }

  /**
   * Determine if a contact is "Fresh"
   */
  static isFreshConnection(contact: Contact): boolean {
    const daysSinceFirstSeen = this.daysBetween(contact.firstSeen, new Date());
    return (
      daysSinceFirstSeen <= this.FRESH_WINDOW_DAYS && !contact.lastInteraction
    );
  }

  /**
   * Generate ordered deck cards for a user
   */
  static generateDeckCards(
    contacts: Contact[],
    userPreferences: UserPreferences
  ): DeckCard[] {
    const scoredContacts = contacts.map((contact) => {
      const factors: RHSFactors = {
        recencyDecay: this.calculateRecencyDecay(contact),
        cadenceFit: this.calculateCadenceFit(contact),
        tagPriority: this.calculateTagPriority(contact),
        manualMutuality: this.calculateManualMutuality(contact),
        fatigueGuard: this.calculateFatigueGuard(contact),
        freshBoost: this.calculateFreshBoost(contact),
      };

      const rhsScore = this.calculateRHS(contact, factors);

      return {
        contact,
        rhsScore,
        factors,
      };
    });

    // Sort by RHS score (highest first)
    const sortedContacts = scoredContacts.sort(
      (a, b) => b.rhsScore - a.rhsScore
    );

    // Ensure we have at least 1 Fresh connection (cap at 2)
    const freshContacts = sortedContacts.filter(({ contact }) =>
      this.isFreshConnection(contact)
    );
    const nonFreshContacts = sortedContacts.filter(
      ({ contact }) => !this.isFreshConnection(contact)
    );

    // Build final deck with Fresh prioritization
    const finalDeck: typeof sortedContacts = [];

    // Add Fresh connections first (at least 1, max 2)
    const freshToAdd = Math.min(Math.max(1, freshContacts.length), 2);
    finalDeck.push(...freshContacts.slice(0, freshToAdd));

    // Fill remaining slots with non-Fresh contacts
    const remainingSlots = userPreferences.deckSize - finalDeck.length;
    finalDeck.push(...nonFreshContacts.slice(0, remainingSlots));

    // Convert to DeckCard format
    return finalDeck.map((item, index) => ({
      id: `card-${item.contact.id}-${new Date().toISOString().split("T")[0]}`,
      contact: item.contact,
      reason: this.generateReason(item.contact, item.factors),
      priority: index + 1,
      rhsScore: item.rhsScore,
      lastTouchContext: this.getLastTouchContext(item.contact),
      suggestedChannels: this.getSuggestedChannels(
        item.contact,
        userPreferences
      ),
    }));
  }

  private static generateReason(contact: Contact, factors: RHSFactors): string {
    if (this.isFreshConnection(contact)) {
      return "New connection - reach out while they remember you!";
    }

    if (factors.cadenceFit > 10) {
      return `Perfect timing for your ${contact.cadencePreference} check-in`;
    }

    if (factors.recencyDecay < -10) {
      return "It's been a while - time to reconnect";
    }

    if (factors.tagPriority > 10) {
      return "High priority contact";
    }

    return "Good time to reach out";
  }

  private static getLastTouchContext(contact: Contact): string | undefined {
    if (!contact.lastInteraction) return undefined;

    const daysAgo = this.daysBetween(contact.lastInteraction, new Date());
    if (daysAgo === 0) return "Contacted today";
    if (daysAgo === 1) return "Contacted yesterday";
    if (daysAgo <= 7) return `Contacted ${daysAgo} days ago`;
    if (daysAgo <= 30) return `Contacted ${Math.floor(daysAgo / 7)} weeks ago`;
    return `Contacted ${Math.floor(daysAgo / 30)} months ago`;
  }

  private static getSuggestedChannels(
    contact: Contact,
    userPreferences: UserPreferences
  ): any[] {
    const channels: any[] = [];

    // SMS (always available)
    if (contact.phoneNumbers?.length) {
      channels.push({
        type: "sms",
        label: "Text",
        value: contact.phoneNumbers[0],
        isPremium: false,
        isAvailable: true,
      });
    }

    // Call (always available)
    if (contact.phoneNumbers?.length) {
      channels.push({
        type: "call",
        label: "Call",
        value: contact.phoneNumbers[0],
        isPremium: false,
        isAvailable: true,
      });
    }

    // Email (premium only for send)
    if (contact.emails?.length) {
      channels.push({
        type: "email",
        label: "Email",
        value: contact.emails[0],
        isPremium: true,
        isAvailable: userPreferences.isPremium,
      });
    }

    return channels;
  }

  private static getCadenceDays(cadence: string): number {
    switch (cadence) {
      case "weekly":
        return 7;
      case "biweekly":
        return 14;
      case "monthly":
        return 30;
      case "quarterly":
        return 90;
      default:
        return 30;
    }
  }

  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
