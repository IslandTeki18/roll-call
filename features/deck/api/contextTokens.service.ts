/**
 * Context Token Management Service
 *
 * Handles storage, retrieval, and lifecycle management of context tokens.
 * Tokens are extracted from user actions (messages, notes, meetings) and used
 * to condition AI drafts for smarter next-time messages.
 *
 * Key Features:
 * - Token cap enforcement (50 tokens per contact per 90 days)
 * - Automatic expiry after 90 days
 * - Token deduplication
 * - Priority-based deletion (lowest confidence first)
 */

import { tablesDB } from '@/features/shared/lib/appwrite';
import { ID, Query } from 'react-native-appwrite';
import { CONTACT_SCORE_COLLECTIONS } from '../lib/contactScore.appwrite.config';
import type { ContextToken, TokenType } from '../types/contactScore.types';

const DATABASE_ID = CONTACT_SCORE_COLLECTIONS.DATABASE_ID;
const CONTEXT_TOKENS_TABLE_ID = CONTACT_SCORE_COLLECTIONS.CONTEXT_TOKENS;

// Token cap: max 50 tokens per contact per 90-day window
const MAX_TOKENS_PER_CONTACT = 50;

// Token TTL: 90 days
const TOKEN_TTL_DAYS = 90;

// ============================================================================
// Token Creation
// ============================================================================

/**
 * Creates a new context token for a contact.
 * Enforces token cap by deleting oldest low-confidence tokens if at limit.
 * Automatically sets expiresAt to 90 days from now.
 *
 * @param contactId - Contact ID from ProfileContacts
 * @param tokenType - Type of token (people, company, topic, etc.)
 * @param tokenValue - Normalized token value (lowercased)
 * @param confidence - Confidence score from NLP extraction (0-1)
 * @param sourceActionId - ActionEvents.$id that generated this token
 * @param isPremiumToken - True if from Email/Slack/Calendar/Occasion action
 * @param metadata - Optional JSON metadata
 * @returns Created token document
 */
export async function createContextToken(
  contactId: string,
  tokenType: TokenType,
  tokenValue: string,
  confidence: number,
  sourceActionId: string,
  isPremiumToken: boolean,
  metadata: Record<string, unknown> = {}
): Promise<ContextToken> {
  // Normalize token value
  const normalizedValue = tokenValue.toLowerCase().trim();

  // Check for duplicate (same type + value for this contact)
  const existing = await checkDuplicateToken(contactId, tokenType, normalizedValue);
  if (existing) {
    console.log(`Token already exists: ${tokenType}:${normalizedValue} for contact ${contactId}`);
    return existing;
  }

  // Enforce token cap (delete oldest low-confidence tokens if needed)
  await enforceTokenCap(contactId);

  // Calculate expiry date (90 days from now)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Create token
  const tokenData = {
    contactId,
    tokenType,
    tokenValue: normalizedValue,
    confidence,
    sourceActionId,
    isPremiumToken,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    metadata: JSON.stringify(metadata),
  };

  const token = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    rowId: ID.unique(),
    data: tokenData,
  });

  return token as unknown as ContextToken;
}

/**
 * Batch creates multiple tokens for a contact.
 * More efficient than creating one at a time.
 *
 * @param contactId - Contact ID
 * @param tokens - Array of token data
 * @returns Array of created tokens
 */
export async function createContextTokensBatch(
  contactId: string,
  tokens: Array<{
    tokenType: TokenType;
    tokenValue: string;
    confidence: number;
    sourceActionId: string;
    isPremiumToken: boolean;
    metadata?: Record<string, unknown>;
  }>
): Promise<ContextToken[]> {
  const createdTokens: ContextToken[] = [];

  for (const tokenData of tokens) {
    try {
      const token = await createContextToken(
        contactId,
        tokenData.tokenType,
        tokenData.tokenValue,
        tokenData.confidence,
        tokenData.sourceActionId,
        tokenData.isPremiumToken,
        tokenData.metadata || {}
      );
      createdTokens.push(token);
    } catch (error) {
      console.error(`Failed to create token ${tokenData.tokenType}:${tokenData.tokenValue}`, error);
      // Continue creating other tokens even if one fails
    }
  }

  return createdTokens;
}

// ============================================================================
// Token Retrieval
// ============================================================================

/**
 * Gets active (non-expired) tokens for a contact.
 * Returns most recent tokens first, up to specified limit.
 *
 * @param contactId - Contact ID
 * @param limit - Max tokens to return (default: 10 for AI conditioning)
 * @returns Array of active tokens, sorted by createdAt DESC
 */
export async function getActiveTokensForContact(
  contactId: string,
  limit: number = 10
): Promise<ContextToken[]> {
  const now = new Date().toISOString();

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [
      Query.equal('contactId', contactId),
      Query.greaterThan('expiresAt', now),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as ContextToken[];
}

/**
 * Gets active tokens for a contact filtered by type.
 * Useful for getting all "topic" tokens or all "people" tokens.
 *
 * @param contactId - Contact ID
 * @param tokenType - Filter by token type
 * @param limit - Max tokens to return
 * @returns Array of tokens matching type, sorted by confidence DESC
 */
export async function getActiveTokensByType(
  contactId: string,
  tokenType: TokenType,
  limit: number = 20
): Promise<ContextToken[]> {
  const now = new Date().toISOString();

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [
      Query.equal('contactId', contactId),
      Query.equal('tokenType', tokenType),
      Query.greaterThan('expiresAt', now),
      Query.orderDesc('confidence'),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as ContextToken[];
}

/**
 * Gets token statistics for a contact.
 * Useful for displaying token count and breakdown by type.
 *
 * @param contactId - Contact ID
 * @returns Token statistics
 */
export async function getTokenStats(contactId: string): Promise<{
  totalTokens: number;
  tokensByType: Record<TokenType, number>;
  premiumTokens: number;
  isAtCap: boolean;
}> {
  const now = new Date().toISOString();

  // Get all active tokens
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [
      Query.equal('contactId', contactId),
      Query.greaterThan('expiresAt', now),
      Query.limit(MAX_TOKENS_PER_CONTACT + 10), // Get all to ensure accuracy
    ],
  });

  const tokens = response.rows as unknown as ContextToken[];

  // Count by type
  const tokensByType: Record<string, number> = {};
  let premiumTokens = 0;

  for (const token of tokens) {
    tokensByType[token.tokenType] = (tokensByType[token.tokenType] || 0) + 1;
    if (token.isPremiumToken) {
      premiumTokens++;
    }
  }

  return {
    totalTokens: tokens.length,
    tokensByType: tokensByType as Record<TokenType, number>,
    premiumTokens,
    isAtCap: tokens.length >= MAX_TOKENS_PER_CONTACT,
  };
}

// ============================================================================
// Token Cap Enforcement
// ============================================================================

/**
 * Enforces the 50-token cap for a contact by deleting oldest low-confidence tokens.
 * Called before creating new tokens to make room if needed.
 *
 * Strategy:
 * 1. Count active tokens
 * 2. If >= 50, delete (count - 49) tokens
 * 3. Delete lowest confidence tokens first
 *
 * @param contactId - Contact ID
 */
async function enforceTokenCap(contactId: string): Promise<void> {
  const now = new Date().toISOString();

  // Get all active tokens
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [
      Query.equal('contactId', contactId),
      Query.greaterThan('expiresAt', now),
      Query.limit(MAX_TOKENS_PER_CONTACT + 10), // Get all to ensure accuracy
    ],
  });

  const tokens = response.rows as unknown as ContextToken[];

  // If under cap, no action needed
  if (tokens.length < MAX_TOKENS_PER_CONTACT) {
    return;
  }

  // Calculate how many to delete
  const tokensToDelete = tokens.length - MAX_TOKENS_PER_CONTACT + 1; // +1 to make room for new token

  // Sort by confidence ASC (lowest confidence first)
  const sortedTokens = [...tokens].sort((a, b) => a.confidence - b.confidence);

  // Delete lowest confidence tokens
  const deletePromises = sortedTokens
    .slice(0, tokensToDelete)
    .map((token) =>
      tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: CONTEXT_TOKENS_TABLE_ID,
        rowId: token.$id,
      })
    );

  await Promise.all(deletePromises);

  console.log(
    `Enforced token cap for contact ${contactId}: deleted ${tokensToDelete} low-confidence tokens`
  );
}

/**
 * Checks if a token already exists for this contact.
 * Prevents duplicate tokens with same type and value.
 *
 * @param contactId - Contact ID
 * @param tokenType - Token type
 * @param tokenValue - Normalized token value
 * @returns Existing token if found, null otherwise
 */
async function checkDuplicateToken(
  contactId: string,
  tokenType: TokenType,
  tokenValue: string
): Promise<ContextToken | null> {
  const now = new Date().toISOString();

  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [
      Query.equal('contactId', contactId),
      Query.equal('tokenType', tokenType),
      Query.equal('tokenValue', tokenValue),
      Query.greaterThan('expiresAt', now),
      Query.limit(1),
    ],
  });

  if (response.rows.length > 0) {
    return response.rows[0] as unknown as ContextToken;
  }

  return null;
}

// ============================================================================
// Token Cleanup (Expired Tokens)
// ============================================================================

/**
 * Deletes expired tokens across all contacts.
 * Should be called by a scheduled background job (daily recommended).
 *
 * @param batchSize - Number of tokens to delete per batch (default: 100)
 * @returns Number of tokens deleted
 */
export async function cleanupExpiredTokens(batchSize: number = 100): Promise<number> {
  const now = new Date().toISOString();

  // Get expired tokens
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [Query.lessThan('expiresAt', now), Query.limit(batchSize)],
  });

  const expiredTokens = response.rows as unknown as ContextToken[];

  if (expiredTokens.length === 0) {
    return 0;
  }

  // Delete all expired tokens
  const deletePromises = expiredTokens.map((token) =>
    tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: CONTEXT_TOKENS_TABLE_ID,
      rowId: token.$id,
    })
  );

  await Promise.all(deletePromises);

  console.log(`Cleaned up ${expiredTokens.length} expired tokens`);
  return expiredTokens.length;
}

/**
 * Deletes all tokens for a specific contact.
 * Used when contact is deleted or user requests data deletion.
 *
 * @param contactId - Contact ID
 * @returns Number of tokens deleted
 */
export async function deleteAllTokensForContact(contactId: string): Promise<number> {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    queries: [Query.equal('contactId', contactId), Query.limit(MAX_TOKENS_PER_CONTACT + 10)],
  });

  const tokens = response.rows as unknown as ContextToken[];

  if (tokens.length === 0) {
    return 0;
  }

  const deletePromises = tokens.map((token) =>
    tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: CONTEXT_TOKENS_TABLE_ID,
      rowId: token.$id,
    })
  );

  await Promise.all(deletePromises);

  console.log(`Deleted ${tokens.length} tokens for contact ${contactId}`);
  return tokens.length;
}

// ============================================================================
// Token Updates (Refresh Expiry)
// ============================================================================

/**
 * Refreshes the expiry date of a token (extends by 90 days from now).
 * Useful when a token is reinforced by new user actions.
 *
 * @param tokenId - Token document ID
 * @returns Updated token
 */
export async function refreshTokenExpiry(tokenId: string): Promise<ContextToken> {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const updatedToken = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: CONTEXT_TOKENS_TABLE_ID,
    rowId: tokenId,
    data: {
      expiresAt: newExpiresAt.toISOString(),
    },
  });

  return updatedToken as unknown as ContextToken;
}
