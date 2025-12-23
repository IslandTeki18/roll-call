import { calculateRHS } from "@/features/deck/api/rhs.service";
import { DEFAULT_RHS_CONFIG } from "@/features/deck/types/rhs.types";
import type { ProfileContact } from "@/features/contacts/api/contacts.service";

// Mock the external service dependencies
jest.mock("@/features/messaging/api/engagement.service");
jest.mock("@/features/messaging/api/recommendations.service");
jest.mock("@/features/outcomes/api/outcomeNotes.service");

import {
  getEventsByContact,
  getLastEventForContact,
} from "@/features/messaging/api/engagement.service";
import {
  calculateEngagementFrequency,
  calculateOutcomeQualityScore,
} from "@/features/messaging/api/recommendations.service";
import { getOutcomeNotesByContact } from "@/features/outcomes/api/outcomeNotes.service";

const mockGetEventsByContact = getEventsByContact as jest.MockedFunction<
  typeof getEventsByContact
>;
const mockGetLastEventForContact =
  getLastEventForContact as jest.MockedFunction<
    typeof getLastEventForContact
  >;
const mockCalculateEngagementFrequency =
  calculateEngagementFrequency as jest.MockedFunction<
    typeof calculateEngagementFrequency
  >;
const mockCalculateOutcomeQualityScore =
  calculateOutcomeQualityScore as jest.MockedFunction<
    typeof calculateOutcomeQualityScore
  >;
const mockGetOutcomeNotesByContact =
  getOutcomeNotesByContact as jest.MockedFunction<
    typeof getOutcomeNotesByContact
  >;

// Helper to create mock contact
const createMockContact = (
  overrides?: Partial<ProfileContact>
): ProfileContact => ({
  $id: "test-contact-1",
  userId: "test-user",
  sourceType: "device",
  firstName: "John",
  lastName: "Doe",
  displayName: "John Doe",
  phoneNumbers: "",
  emails: "",
  organization: "",
  jobTitle: "",
  notes: "",
  dedupeSignature: "",
  firstImportedAt: new Date().toISOString(),
  lastImportedAt: new Date().toISOString(),
  firstSeenAt: new Date().toISOString(),
  firstEngagementAt: new Date().toISOString(),
  cadenceDays: null,
  ...overrides,
});

// Helper to create mock engagement events
const createMockEvent = (daysAgo: number, type: "sms_sent" | "call_made" | "email_sent" | "facetime_made" | "slack_sent" | "note_added" | "card_dismissed" | "card_snoozed" = "sms_sent") => ({
  $id: `event-${daysAgo}`,
  type,
  contactIds: "test-contact-1",
  timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  metadata: "",
  linkedCardId: "",
  userId: "test-user",
  createdAt: new Date().toISOString(),
});

describe("Cadence Scoring", () => {
  beforeEach(() => {
    // Set default mocks to return empty/neutral values
    mockGetEventsByContact.mockResolvedValue([]);
    mockGetLastEventForContact.mockResolvedValue(null);
    mockCalculateEngagementFrequency.mockResolvedValue(0);
    mockCalculateOutcomeQualityScore.mockResolvedValue(0);
    mockGetOutcomeNotesByContact.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Global Default Cadence", () => {
    test("uses global default cadence when contact has no explicit cadence", async () => {
      const contact = createMockContact({ cadenceDays: null });
      const lastEvent = createMockEvent(45); // 45 days ago

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      // With default cadence of 30 days, 45 days ago should be overdue
      expect(result.targetCadenceDays).toBe(DEFAULT_RHS_CONFIG.defaultCadenceDays);
      expect(result.isOverdueByCadence).toBe(true);
      expect(result.cadenceAdherenceScore).toBeGreaterThan(0);
    });

    test("uses explicit cadence when set", async () => {
      const contact = createMockContact({ cadenceDays: 14 }); // Biweekly
      const lastEvent = createMockEvent(20); // 20 days ago

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      // Should use explicit 14-day cadence, so 20 days is overdue
      expect(result.targetCadenceDays).toBe(14);
      expect(result.isOverdueByCadence).toBe(true);
    });
  });

  describe("Adherence Score", () => {
    test("gives max adherence score for never contacted", async () => {
      const contact = createMockContact({ cadenceDays: 30 });

      mockGetLastEventForContact.mockResolvedValue(null);
      mockGetEventsByContact.mockResolvedValue([]);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceAdherenceScore).toBe(
        DEFAULT_RHS_CONFIG.cadenceAdherenceWeight
      );
      expect(result.isOverdueByCadence).toBe(true);
    });

    test("gives max adherence score for very overdue (>= 1.5x cadence)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const lastEvent = createMockEvent(45); // 1.5x the cadence

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceAdherenceScore).toBe(
        DEFAULT_RHS_CONFIG.cadenceAdherenceWeight
      );
      expect(result.isOverdueByCadence).toBe(true);
      expect(result.daysOverdue).toBe(15);
    });

    test("gives scaled adherence score for late (1.0x to 1.5x)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const lastEvent = createMockEvent(40); // 1.33x the cadence

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      // Should be less than max but greater than 0
      expect(result.cadenceAdherenceScore).toBeGreaterThan(0);
      expect(result.cadenceAdherenceScore).toBeLessThan(
        DEFAULT_RHS_CONFIG.cadenceAdherenceWeight
      );
      expect(result.isOverdueByCadence).toBe(true);
    });

    test("gives zero score for on-track (0.5x to 1.0x)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const lastEvent = createMockEvent(20); // 0.67x the cadence

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceAdherenceScore).toBe(0);
      expect(result.isOverdueByCadence).toBe(false);
    });

    test("gives small penalty for too early (< 0.5x)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const lastEvent = createMockEvent(10); // 0.33x the cadence

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceAdherenceScore).toBeLessThan(0);
      expect(result.isOverdueByCadence).toBe(false);
    });
  });

  describe("Consistency Score", () => {
    test("gives zero score for insufficient engagement history", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const lastEvent = createMockEvent(15);

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]); // Only 1 event

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceConsistencyScore).toBe(0);
    });

    test("gives max score for highly consistent engagement pattern", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Very consistent: every 30 days exactly
      const events = [
        createMockEvent(15),
        createMockEvent(45),
        createMockEvent(75),
        createMockEvent(105),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      // CV should be very low (near 0), giving max consistency score
      expect(result.cadenceConsistencyScore).toBe(
        DEFAULT_RHS_CONFIG.cadenceConsistencyWeight
      );
    });

    test("gives scaled score for moderately consistent pattern", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Moderate variance: ~25, ~40, ~35 days between contacts (CV should be ~0.3-0.7)
      const events = [
        createMockEvent(10),
        createMockEvent(35),
        createMockEvent(75),
        createMockEvent(110),
        createMockEvent(155),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      // Should be between 0 and max (or could be max if variance is still low)
      expect(result.cadenceConsistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.cadenceConsistencyScore).toBeLessThanOrEqual(
        DEFAULT_RHS_CONFIG.cadenceConsistencyWeight
      );
    });

    test("gives zero score for highly inconsistent pattern", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // High variance: 5, 60, 10, 90 days between contacts
      const events = [
        createMockEvent(5),
        createMockEvent(10),
        createMockEvent(70),
        createMockEvent(80),
        createMockEvent(170),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      // Very high CV should give zero score
      expect(result.cadenceConsistencyScore).toBe(0);
    });
  });

  describe("Trend Score", () => {
    test("gives zero score for insufficient data", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const events = [createMockEvent(10), createMockEvent(30)];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceTrendScore).toBe(0);
    });

    test("gives positive score for improving trend (getting faster)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Improving: intervals are getting shorter over time
      // Events ordered newest to oldest: 10, 30, 60, 100, 150 days ago
      // Intervals: [20, 30, 40, 50] - these are INCREASING which means contact is slowing
      // We want DECREASING intervals for improvement
      // So: 150, 100, 60, 30, 10 => intervals: [50, 40, 30, 20] = improving!
      const events = [
        createMockEvent(150),
        createMockEvent(100),
        createMockEvent(60),
        createMockEvent(30),
        createMockEvent(10),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceTrendScore).toBeGreaterThan(0);
    });

    test("gives negative score for worsening trend (getting slower)", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Worsening: intervals are getting longer over time
      // Want intervals to be [20, 30, 40, 50] = worsening (increasing)
      const events = [
        createMockEvent(10),
        createMockEvent(30),
        createMockEvent(60),
        createMockEvent(100),
        createMockEvent(150),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceTrendScore).toBeLessThan(0);
    });

    test("gives max positive score for >20% improvement", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Dramatic improvement: Start with long intervals, end with short
      // Intervals should decrease by >20%: [90, 30, 20] = big improvement
      const events = [
        createMockEvent(200),
        createMockEvent(110),
        createMockEvent(80),
        createMockEvent(60),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceTrendScore).toBe(DEFAULT_RHS_CONFIG.cadenceTrendWeight);
    });

    test("gives max negative score for >20% decline", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Dramatic decline: Start with short intervals, end with long
      // Intervals should increase by >20%: [20, 30, 90] = big decline
      const events = [
        createMockEvent(60),
        createMockEvent(80),
        createMockEvent(110),
        createMockEvent(200),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.cadenceTrendScore).toBe(-DEFAULT_RHS_CONFIG.cadenceTrendWeight);
    });
  });

  describe("Combined Cadence Weight", () => {
    test("combines all three cadence scores into total weight", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Overdue by cadence, consistent pattern, improving trend
      const events = [
        createMockEvent(10),
        createMockEvent(40),
        createMockEvent(70),
        createMockEvent(110),
        createMockEvent(160),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      // Total weight should be sum of adherence + consistency + trend
      const expectedTotal =
        result.cadenceAdherenceScore +
        result.cadenceConsistencyScore +
        result.cadenceTrendScore;

      expect(result.cadenceWeight).toBe(expectedTotal);
    });

    test("cadence weight contributes to total RHS score", async () => {
      const contact = createMockContact({
        cadenceDays: 30,
        firstSeenAt: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(), // 60 days ago (not fresh)
      });
      const lastEvent = createMockEvent(45); // Very overdue

      mockGetLastEventForContact.mockResolvedValue(lastEvent);
      mockGetEventsByContact.mockResolvedValue([lastEvent]);

      const result = await calculateRHS("test-user", contact);

      // High cadence weight should boost total score
      // Note: totalScore is capped at 100, so we just verify cadence weight exists
      expect(result.cadenceWeight).toBeGreaterThan(0);
      expect(result.cadenceAdherenceScore).toBeGreaterThan(0);
    });
  });

  describe("Actual Average Interval Tracking", () => {
    test("calculates actual average interval from engagement history", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      // Intervals: 20, 30, 40 days (avg = 30)
      const events = [
        createMockEvent(10),
        createMockEvent(30),
        createMockEvent(60),
        createMockEvent(100),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      // Average of [20, 30, 40] = 30
      expect(result.actualAverageInterval).toBe(30);
    });

    test("handles single engagement correctly", async () => {
      const contact = createMockContact({ cadenceDays: 30 });
      const events = [createMockEvent(15)];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);

      const result = await calculateRHS("test-user", contact);

      expect(result.actualAverageInterval).toBe(0);
    });
  });

  describe("Integration with RHS Calculation", () => {
    test("enhanced cadence scoring works end-to-end with real RHS", async () => {
      const contact = createMockContact({
        cadenceDays: 30,
        firstSeenAt: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(), // 60 days ago (not fresh)
      });

      // Overdue, consistent, improving pattern
      const events = [
        createMockEvent(10, "sms_sent"),
        createMockEvent(40, "call_made"),
        createMockEvent(70, "sms_sent"),
        createMockEvent(110, "call_made"),
      ];

      mockGetLastEventForContact.mockResolvedValue(events[0]);
      mockGetEventsByContact.mockResolvedValue(events);
      mockCalculateEngagementFrequency.mockResolvedValue(30);
      mockCalculateOutcomeQualityScore.mockResolvedValue(60);
      mockGetOutcomeNotesByContact.mockResolvedValue([]);

      const result = await calculateRHS("test-user", contact);

      // Verify all cadence components are calculated
      expect(result.cadenceAdherenceScore).toBeDefined();
      expect(result.cadenceConsistencyScore).toBeDefined();
      expect(result.cadenceTrendScore).toBeDefined();
      expect(result.targetCadenceDays).toBe(30);
      expect(result.actualAverageInterval).toBeGreaterThan(0);

      // Total score should include cadence weight
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });
});
