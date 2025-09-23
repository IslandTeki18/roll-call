// cardBuilders.ts
import { Contact, DeckCard, Draft, Channel } from "../model/deck.types";

export class CardBuilders {
  /**
   * Generate draft messages for a contact
   */
  static generateDrafts(card: DeckCard, channel: Channel): Draft[] {
    const { contact, reason, lastTouchContext } = card;
    const drafts: Draft[] = [];

    // Generate 2 different drafts as per PRD
    drafts.push(
      this.generateCasualDraft(contact, reason, lastTouchContext, channel),
      this.generateProfessionalDraft(contact, reason, lastTouchContext, channel)
    );

    return drafts;
  }

  /**
   * Generate a casual-toned draft
   */
  private static generateCasualDraft(
    contact: Contact,
    reason: string,
    lastTouchContext: string | undefined,
    channel: Channel
  ): Draft {
    const firstName = contact.firstName || contact.displayName.split(" ")[0];

    let content = "";

    if (reason.includes("New connection")) {
      content = this.getCasualFreshConnectionDraft(firstName);
    } else if (reason.includes("Perfect timing")) {
      content = this.getCasualCadenceDraft(firstName);
    } else if (reason.includes("It's been a while")) {
      content = this.getCasualReconnectDraft(firstName, lastTouchContext);
    } else {
      content = this.getCasualGeneralDraft(firstName);
    }

    return {
      id: `draft-casual-${contact.id}-${Date.now()}`,
      content,
      tone: "casual",
      reason: this.getDraftReason(reason, "casual"),
      channel,
    };
  }

  /**
   * Generate a professional-toned draft
   */
  private static generateProfessionalDraft(
    contact: Contact,
    reason: string,
    lastTouchContext: string | undefined,
    channel: Channel
  ): Draft {
    const firstName = contact.firstName || contact.displayName.split(" ")[0];

    let content = "";

    if (reason.includes("New connection")) {
      content = this.getProfessionalFreshConnectionDraft(firstName);
    } else if (reason.includes("Perfect timing")) {
      content = this.getProfessionalCadenceDraft(firstName);
    } else if (reason.includes("It's been a while")) {
      content = this.getProfessionalReconnectDraft(firstName, lastTouchContext);
    } else {
      content = this.getProfessionalGeneralDraft(firstName);
    }

    return {
      id: `draft-professional-${contact.id}-${Date.now()}`,
      content,
      tone: "professional",
      reason: this.getDraftReason(reason, "professional"),
      channel,
    };
  }

  // Casual draft templates
  private static getCasualFreshConnectionDraft(firstName: string): string {
    const templates = [
      `Hey ${firstName}! Hope you're doing well. It was great meeting you recently 👋`,
      `Hi ${firstName}! Been thinking about our conversation - hope you're having a great week!`,
      `${firstName}! How are things going? Really enjoyed chatting with you`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getCasualCadenceDraft(firstName: string): string {
    const templates = [
      `Hey ${firstName}! Just checking in - how have you been?`,
      `Hi ${firstName}! Hope you're crushing it lately. What's new?`,
      `${firstName}! Time for our regular catch up - how's life treating you?`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getCasualReconnectDraft(
    firstName: string,
    lastTouch?: string
  ): string {
    const templates = [
      `Hey ${firstName}! I know it's been a while - hope you're doing amazing!`,
      `Hi ${firstName}! Been way too long since we connected. How are things?`,
      `${firstName}! I was just thinking about you - hope all is well on your end!`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getCasualGeneralDraft(firstName: string): string {
    const templates = [
      `Hey ${firstName}! Hope your week is going well 😊`,
      `Hi ${firstName}! Just wanted to reach out and see how you're doing`,
      `${firstName}! Hope you're having a great day - thinking of you!`,
    ];
    return this.getRandomTemplate(templates);
  }

  // Professional draft templates
  private static getProfessionalFreshConnectionDraft(
    firstName: string
  ): string {
    const templates = [
      `Hi ${firstName}, I hope this message finds you well. It was a pleasure meeting you recently.`,
      `Hello ${firstName}, I wanted to follow up on our recent conversation. I hope you're doing well.`,
      `Hi ${firstName}, I hope you're having a productive week. It was great connecting with you.`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getProfessionalCadenceDraft(firstName: string): string {
    const templates = [
      `Hi ${firstName}, I hope you're doing well. I wanted to check in and see how things are going.`,
      `Hello ${firstName}, I hope this finds you in good spirits. How have things been on your end?`,
      `Hi ${firstName}, I hope you're having a productive week. I'd love to hear how you've been.`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getProfessionalReconnectDraft(
    firstName: string,
    lastTouch?: string
  ): string {
    const templates = [
      `Hi ${firstName}, I hope you're doing well. I realize it's been some time since we last connected.`,
      `Hello ${firstName}, I hope this message finds you thriving. I've been meaning to reach out.`,
      `Hi ${firstName}, I hope you're having a great week. I wanted to reconnect after our time apart.`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getProfessionalGeneralDraft(firstName: string): string {
    const templates = [
      `Hi ${firstName}, I hope you're doing well and having a productive week.`,
      `Hello ${firstName}, I hope this message finds you in good health and spirits.`,
      `Hi ${firstName}, I wanted to reach out and see how you've been lately.`,
    ];
    return this.getRandomTemplate(templates);
  }

  private static getDraftReason(
    cardReason: string,
    tone: "casual" | "professional"
  ): string {
    if (cardReason.includes("New connection")) {
      return `${
        tone === "casual" ? "Friendly" : "Professional"
      } follow-up to new connection`;
    }
    if (cardReason.includes("Perfect timing")) {
      return `${
        tone === "casual" ? "Casual" : "Professional"
      } check-in at ideal cadence`;
    }
    if (cardReason.includes("It's been a while")) {
      return `${
        tone === "casual" ? "Warm" : "Professional"
      } reconnection message`;
    }
    return `${tone === "casual" ? "Friendly" : "Professional"} touch base`;
  }

  private static getRandomTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Create channels for a contact based on available contact info
   */
  static createChannelsForContact(
    contact: Contact,
    isPremium: boolean
  ): Channel[] {
    const channels: Channel[] = [];

    // SMS - always available if phone number exists
    if (contact.phoneNumbers?.length) {
      channels.push({
        type: "sms",
        label: "Text Message",
        value: contact.phoneNumbers[0],
        isPremium: false,
        isAvailable: true,
      });
    }

    // Call - always available if phone number exists
    if (contact.phoneNumbers?.length) {
      channels.push({
        type: "call",
        label: "Phone Call",
        value: contact.phoneNumbers[0],
        isPremium: false,
        isAvailable: true,
      });
    }

    // FaceTime - iOS only, if phone number exists
    if (contact.phoneNumbers?.length && this.isIOS()) {
      channels.push({
        type: "facetime",
        label: "FaceTime",
        value: contact.phoneNumbers[0],
        isPremium: false,
        isAvailable: true,
      });
    }

    // Email - compose always available, send requires premium
    if (contact.emails?.length) {
      channels.push({
        type: "email",
        label: isPremium ? "Send Email" : "Compose Email",
        value: contact.emails[0],
        isPremium: isPremium, // Send is premium, compose is free
        isAvailable: true,
      });
    }

    // Premium channels (if user has premium)
    if (isPremium) {
      // Slack (if contact has Slack info)
      if (contact.source === "slack") {
        channels.push({
          type: "slack",
          label: "Slack Message",
          value: contact.id, // Slack user ID
          isPremium: true,
          isAvailable: true,
        });
      }

      // Deep link channels
      if (contact.phoneNumbers?.length) {
        channels.push(
          {
            type: "whatsapp",
            label: "WhatsApp",
            value: contact.phoneNumbers[0],
            isPremium: true,
            isAvailable: true,
          },
          {
            type: "telegram",
            label: "Telegram",
            value: contact.phoneNumbers[0],
            isPremium: true,
            isAvailable: true,
          }
        );
      }

      // LinkedIn (would need LinkedIn profile info)
      // This would be implemented when LinkedIn integration is added
      channels.push({
        type: "linkedin",
        label: "LinkedIn Message",
        value: contact.displayName, // Would use LinkedIn profile URL
        isPremium: true,
        isAvailable: false, // Not implemented in v1
      });
    }

    return channels;
  }

  /**
   * Check if running on iOS
   */
  private static isIOS(): boolean {
    // In a real React Native app, you'd use Platform.OS === 'ios'
    // For now, we'll return true as a placeholder
    return true;
  }

  /**
   * Generate contextual reason for why this draft was created
   */
  static generateDraftContext(contact: Contact, reason: string): string {
    const contextParts: string[] = [];

    // Add source context
    if (contact.source !== "device") {
      contextParts.push(`from ${contact.source}`);
    }

    // Add fresh connection context
    if (reason.includes("New connection")) {
      const daysSinceFirstSeen = Math.floor(
        (Date.now() - contact.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
      );
      contextParts.push(`met ${daysSinceFirstSeen} days ago`);
    }

    // Add last touch context
    if (contact.lastInteraction) {
      const daysSinceLastTouch = Math.floor(
        (Date.now() - contact.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastTouch > 0) {
        contextParts.push(`last contacted ${daysSinceLastTouch} days ago`);
      }
    }

    // Add tag context
    if (contact.tags?.length) {
      const importantTags = contact.tags.filter((tag) =>
        ["vip", "client", "investor", "family", "colleague"].includes(
          tag.toLowerCase()
        )
      );
      if (importantTags.length > 0) {
        contextParts.push(`tagged as ${importantTags[0]}`);
      }
    }

    return contextParts.length > 0
      ? `Contact ${contextParts.join(", ")}`
      : "Contact from your network";
  }

  /**
   * Create a minimal card for testing/demo purposes
   */
  static createDemoCard(
    contact: Contact,
    isPremium: boolean = false
  ): DeckCard {
    const channels = this.createChannelsForContact(contact, isPremium);
    const reason = contact.lastInteraction
      ? "Perfect timing for your regular check-in"
      : "New connection - reach out while they remember you!";

    return {
      id: `demo-card-${contact.id}`,
      contact,
      reason,
      priority: 1,
      rhsScore: 75,
      lastTouchContext: contact.lastInteraction
        ? `Contacted ${Math.floor(
            (Date.now() - contact.lastInteraction.getTime()) /
              (1000 * 60 * 60 * 24)
          )} days ago`
        : undefined,
      suggestedChannels: channels,
    };
  }

  /**
   * Create demo contact for testing
   */
  static createDemoContact(overrides: Partial<Contact> = {}): Contact {
    return {
      id: `demo-contact-${Date.now()}`,
      firstName: "Alex",
      lastName: "Johnson",
      displayName: "Alex Johnson",
      phoneNumbers: ["+1 (555) 123-4567"],
      emails: ["alex.johnson@example.com"],
      tags: ["colleague"],
      firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      lastInteraction: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      cadencePreference: "biweekly",
      mutualityScore: 8,
      source: "device",
      ...overrides,
    };
  }
}
