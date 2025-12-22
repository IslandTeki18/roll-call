import {
  saveRHSMetrics,
  getRHSMetrics,
  calculateAndPersistRHS,
  batchGetRHSMetrics,
  deleteRHSMetrics,
} from "../rhsMetrics.service";
import { calculateRHS } from "../rhs.service";
import type { RHSMetricsInput } from "../../types/rhsMetrics.types";
import type { ProfileContact } from "@/features/contacts/api/contacts.service";

// Mock dependencies
jest.mock("../rhs.service");
jest.mock("@/features/shared/lib/appwrite");
jest.mock("@/features/messaging/api/engagement.service");
jest.mock("@/features/messaging/api/recommendations.service");
jest.mock("@/features/outcomes/api/outcomeNotes.service");

import { tablesDB } from "@/features/shared/lib/appwrite";

const mockTablesDB = tablesDB as jest.Mocked<typeof tablesDB>;
const mockCalculateRHS = calculateRHS as jest.MockedFunction<
  typeof calculateRHS
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
  cadenceDays: 30,
  ...overrides,
});

// Helper to create mock RHS factors
const createMockRHSFactors = () => ({
  recencyScore: 40,
  freshnessBoost: 0,
  fatigueGuardPenalty: 0,
  cadenceWeight: 25,
  engagementQualityBonus: 10,
  conversationDepthBonus: 15,
  decayPenalty: 0,
  totalScore: 90,
  daysSinceLastEngagement: 15,
  totalEngagements: 10,
  positiveOutcomes: 8,
  negativeOutcomes: 0,
  averageEngagementFrequency: 20,
  isOverdueByCadence: false,
  daysOverdue: 0,
  cadenceAdherenceScore: 20,
  cadenceConsistencyScore: 15,
  cadenceTrendScore: 5,
  targetCadenceDays: 30,
  actualAverageInterval: 25,
});

describe("RHS Metrics Persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveRHSMetrics", () => {
    test("creates new record when none exists", async () => {
      const input: RHSMetricsInput = {
        userId: "test-user",
        contactId: "test-contact-1",
        rhsScore: 90,
        recencyScore: 40,
        freshnessBoost: 0,
        fatigueGuardPenalty: 0,
        cadenceWeight: 25,
        engagementQualityBonus: 10,
        conversationDepthBonus: 15,
        decayPenalty: 0,
        cadenceAdherenceScore: 20,
        cadenceConsistencyScore: 15,
        cadenceTrendScore: 5,
        targetCadenceDays: 30,
        actualAverageInterval: 25,
        daysSinceLastEngagement: 15,
        totalEngagements: 10,
        positiveOutcomes: 8,
        negativeOutcomes: 0,
        averageEngagementFrequency: 20,
        isOverdueByCadence: false,
        daysOverdue: 0,
        decayStartDays: 30,
        currentDecayPenalty: 0,
        engagementHistoryFactor: 0.6,
        lastEngagementAt: new Date().toISOString(),
      };

      // Mock no existing record
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      // Mock create
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: "metric-1",
        ...input,
        calculatedAt: new Date().toISOString(),
      });

      const result = await saveRHSMetrics(input);

      expect(result).toBeDefined();
      expect(result.rhsScore).toBe(90);
      expect(mockTablesDB.createRow).toHaveBeenCalled();
    });

    test("updates existing record when found", async () => {
      const input: RHSMetricsInput = {
        userId: "test-user",
        contactId: "test-contact-1",
        rhsScore: 85,
        recencyScore: 50,
        freshnessBoost: 0,
        fatigueGuardPenalty: 0,
        cadenceWeight: 20,
        engagementQualityBonus: 15,
        conversationDepthBonus: 10,
        decayPenalty: 10,
        cadenceAdherenceScore: 15,
        cadenceConsistencyScore: 10,
        cadenceTrendScore: 0,
        targetCadenceDays: 30,
        actualAverageInterval: 28,
        daysSinceLastEngagement: 20,
        totalEngagements: 12,
        positiveOutcomes: 9,
        negativeOutcomes: 1,
        averageEngagementFrequency: 22,
        isOverdueByCadence: false,
        daysOverdue: 0,
        decayStartDays: 30,
        currentDecayPenalty: 10,
        engagementHistoryFactor: 0.6,
        lastEngagementAt: new Date().toISOString(),
      };

      // Mock existing record
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{ $id: "metric-1", ...input }],
        total: 1,
      });

      // Mock update
      mockTablesDB.updateRow.mockResolvedValueOnce({
        $id: "metric-1",
        ...input,
        calculatedAt: new Date().toISOString(),
      });

      const result = await saveRHSMetrics(input);

      expect(result).toBeDefined();
      expect(result.rhsScore).toBe(85);
      expect(mockTablesDB.updateRow).toHaveBeenCalled();
      expect(mockTablesDB.createRow).not.toHaveBeenCalled();
    });
  });

  describe("getRHSMetrics", () => {
    test("returns metrics when found", async () => {
      const mockMetric = {
        $id: "metric-1",
        userId: "test-user",
        contactId: "test-contact-1",
        rhsScore: 90,
        calculatedAt: new Date().toISOString(),
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockMetric],
        total: 1,
      });

      const result = await getRHSMetrics("test-user", "test-contact-1");

      expect(result).toBeDefined();
      expect(result?.rhsScore).toBe(90);
    });

    test("returns null when not found", async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      const result = await getRHSMetrics("test-user", "test-contact-1");

      expect(result).toBeNull();
    });

    test("returns null on error", async () => {
      mockTablesDB.listRows.mockRejectedValueOnce(new Error("Database error"));

      const result = await getRHSMetrics("test-user", "test-contact-1");

      expect(result).toBeNull();
    });
  });

  describe("calculateAndPersistRHS", () => {
    test("calculates and saves RHS metrics", async () => {
      const contact = createMockContact();
      const mockFactors = createMockRHSFactors();

      mockCalculateRHS.mockResolvedValueOnce(mockFactors);

      // Mock no existing record
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      // Mock create
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: "metric-1",
        userId: "test-user",
        contactId: contact.$id,
        rhsScore: mockFactors.totalScore,
        calculatedAt: new Date().toISOString(),
      });

      const result = await calculateAndPersistRHS("test-user", contact);

      expect(mockCalculateRHS).toHaveBeenCalledWith("test-user", contact, undefined);
      expect(result).toBeDefined();
      expect(result.rhsScore).toBe(90);
    });
  });

  describe("batchGetRHSMetrics", () => {
    test("retrieves metrics for multiple contacts", async () => {
      const contactIds = ["contact-1", "contact-2", "contact-3"];
      const mockMetrics = [
        {
          $id: "metric-1",
          userId: "test-user",
          contactId: "contact-1",
          rhsScore: 90,
          calculatedAt: "2025-01-01T00:00:00Z",
        },
        {
          $id: "metric-2",
          userId: "test-user",
          contactId: "contact-2",
          rhsScore: 75,
          calculatedAt: "2025-01-01T00:00:00Z",
        },
        {
          $id: "metric-3",
          userId: "test-user",
          contactId: "contact-3",
          rhsScore: 60,
          calculatedAt: "2025-01-01T00:00:00Z",
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockMetrics,
        total: 3,
      });

      const result = await batchGetRHSMetrics("test-user", contactIds);

      expect(result.size).toBe(3);
      expect(result.get("contact-1")?.rhsScore).toBe(90);
      expect(result.get("contact-2")?.rhsScore).toBe(75);
      expect(result.get("contact-3")?.rhsScore).toBe(60);
    });

    test("returns only requested contacts", async () => {
      const contactIds = ["contact-1", "contact-3"];
      const mockMetrics = [
        {
          $id: "metric-1",
          userId: "test-user",
          contactId: "contact-1",
          rhsScore: 90,
          calculatedAt: "2025-01-01T00:00:00Z",
        },
        {
          $id: "metric-2",
          userId: "test-user",
          contactId: "contact-2",
          rhsScore: 75,
          calculatedAt: "2025-01-01T00:00:00Z",
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockMetrics,
        total: 2,
      });

      const result = await batchGetRHSMetrics("test-user", contactIds);

      expect(result.size).toBe(1); // Only contact-1 is in requested list
      expect(result.has("contact-1")).toBe(true);
      expect(result.has("contact-2")).toBe(false);
    });
  });

  describe("deleteRHSMetrics", () => {
    test("deletes existing metrics", async () => {
      const mockMetric = {
        $id: "metric-1",
        userId: "test-user",
        contactId: "test-contact-1",
        rhsScore: 90,
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockMetric],
        total: 1,
      });

      mockTablesDB.deleteRow.mockResolvedValueOnce(undefined);

      const result = await deleteRHSMetrics("test-user", "test-contact-1");

      expect(result).toBe(true);
      expect(mockTablesDB.deleteRow).toHaveBeenCalledWith(
        expect.objectContaining({
          rowId: "metric-1",
        })
      );
    });

    test("returns false when metrics not found", async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      const result = await deleteRHSMetrics("test-user", "test-contact-1");

      expect(result).toBe(false);
      expect(mockTablesDB.deleteRow).not.toHaveBeenCalled();
    });
  });
});
