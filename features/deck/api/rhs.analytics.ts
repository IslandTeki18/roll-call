import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { calculateRHS } from "./rhs.service";

export interface RHSAnalytics {
  averageRHS: number;
  medianRHS: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  topRecencyContacts: { contactId: string; score: number }[];
  topCadenceOverdue: { contactId: string; daysOverdue: number }[];
  topFreshContacts: { contactId: string; boost: number }[];
  atRiskCount: number;
  strongRelationshipsCount: number;
  needsAttentionCount: number;
  totalContacts: number;
  contactsWithCadence: number;
  contactsOverdue: number;
  newContactsCount: number;
}

export const generateRHSAnalytics = async (
  userId: string,
  contacts: ProfileContact[]
): Promise<RHSAnalytics> => {
  const rhsResults = await Promise.all(
    contacts.map(async (contact) => ({
      contact,
      rhs: await calculateRHS(userId, contact),
    }))
  );

  const rhsScores = rhsResults.map((r) => r.rhs.totalScore);
  const averageRHS =
    rhsScores.reduce((a, b) => a + b, 0) / (rhsScores.length || 1);

  const sortedScores = [...rhsScores].sort((a, b) => a - b);
  const medianRHS =
    sortedScores.length % 2 === 0
      ? (sortedScores[sortedScores.length / 2 - 1] +
          sortedScores[sortedScores.length / 2]) /
        2
      : sortedScores[Math.floor(sortedScores.length / 2)];

  const highPriorityCount = rhsResults.filter(
    (r) => r.rhs.totalScore >= 70
  ).length;
  const mediumPriorityCount = rhsResults.filter(
    (r) => r.rhs.totalScore >= 40 && r.rhs.totalScore < 70
  ).length;
  const lowPriorityCount = rhsResults.filter(
    (r) => r.rhs.totalScore < 40
  ).length;

  const topRecencyContacts = [...rhsResults]
    .sort((a, b) => b.rhs.recencyScore - a.rhs.recencyScore)
    .slice(0, 10)
    .map((r) => ({
      contactId: r.contact.$id,
      score: r.rhs.recencyScore,
    }));

  const topCadenceOverdue = rhsResults
    .filter((r) => r.rhs.isOverdueByCadence)
    .sort((a, b) => b.rhs.daysOverdue - a.rhs.daysOverdue)
    .slice(0, 10)
    .map((r) => ({
      contactId: r.contact.$id,
      daysOverdue: r.rhs.daysOverdue,
    }));

  const topFreshContacts = rhsResults
    .filter((r) => r.rhs.freshnessBoost > 0)
    .sort((a, b) => b.rhs.freshnessBoost - a.rhs.freshnessBoost)
    .slice(0, 10)
    .map((r) => ({
      contactId: r.contact.$id,
      boost: r.rhs.freshnessBoost,
    }));

  const atRiskCount = rhsResults.filter(
    (r) => r.rhs.totalScore >= 70 && r.rhs.negativeOutcomes > 0
  ).length;

  const strongRelationshipsCount = rhsResults.filter(
    (r) =>
      r.rhs.totalScore < 40 &&
      r.rhs.positiveOutcomes > 0 &&
      r.rhs.totalEngagements > 3
  ).length;

  const needsAttentionCount = rhsResults.filter(
    (r) =>
      r.rhs.totalScore >= 60 &&
      (r.rhs.daysSinceLastEngagement === null ||
        r.rhs.daysSinceLastEngagement > 30)
  ).length;

  const contactsWithCadence = contacts.filter(
    (c) => c.cadenceDays && c.cadenceDays > 0
  ).length;

  const contactsOverdue = rhsResults.filter(
    (r) => r.rhs.isOverdueByCadence
  ).length;

  const newContactsCount = rhsResults.filter(
    (r) => r.rhs.freshnessBoost > 0
  ).length;

  return {
    averageRHS: Math.round(averageRHS),
    medianRHS: Math.round(medianRHS),
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    topRecencyContacts,
    topCadenceOverdue,
    topFreshContacts,
    atRiskCount,
    strongRelationshipsCount,
    needsAttentionCount,
    totalContacts: contacts.length,
    contactsWithCadence,
    contactsOverdue,
    newContactsCount,
  };
};
