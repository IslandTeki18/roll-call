/**
 * Appwrite Collection Configuration for Contact Score System
 *
 * This file contains the complete configuration specs for creating the three
 * Contact Score collections in Appwrite. Use these specs when manually creating
 * collections in the Appwrite console or via the Appwrite CLI.
 *
 * Collections:
 * 1. ActionEvents - User action tracking with point calculations
 * 2. ContextTokens - Extracted context for AI draft conditioning
 * 3. ContactScores - Real-time contact scores for deck prioritization
 */

// ============================================================================
// Collection IDs (from environment variables)
// ============================================================================

export const CONTACT_SCORE_COLLECTIONS = {
  ACTION_EVENTS: process.env.EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID!,
  CONTEXT_TOKENS: process.env.EXPO_PUBLIC_APPWRITE_CONTEXT_TOKENS_TABLE_ID!,
  CONTACT_SCORES: process.env.EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID!,
  DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
} as const;

// ============================================================================
// Collection 1: ActionEvents Configuration
// ============================================================================

export const ACTION_EVENTS_SCHEMA = {
  collectionName: 'ActionEvents',
  permissions: {
    read: 'user:{userId}',
    create: 'user:{userId}',
    update: 'none', // Immutable after creation
    delete: 'user:{userId}', // For user data deletion only
  },
  attributes: [
    // Core Fields
    {
      key: 'userId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'contactId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'actionId',
      type: 'string',
      size: 100,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'timestamp',
      type: 'datetime',
      required: true,
      array: false,
      default: null, // Set to now() on creation
    },

    // Point Calculation
    {
      key: 'basePoints',
      type: 'float',
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'multipliersApplied',
      type: 'string',
      size: 500,
      required: true,
      array: false,
      default: '{}',
    },
    {
      key: 'finalPoints',
      type: 'float',
      required: true,
      array: false,
      default: null,
    },

    // Context Fields
    {
      key: 'channel',
      type: 'string',
      size: 50,
      required: false,
      array: false,
      default: '',
    },
    {
      key: 'customizationLevel',
      type: 'string',
      size: 50,
      required: false,
      array: false,
      default: '',
    },
    {
      key: 'isMultiContact',
      type: 'boolean',
      required: true,
      array: false,
      default: false,
    },
    {
      key: 'linkedCardId',
      type: 'string',
      size: 255,
      required: false,
      array: false,
      default: '',
    },
    {
      key: 'metadata',
      type: 'string',
      size: 2000,
      required: true,
      array: false,
      default: '{}',
    },

    // Audit
    {
      key: 'createdAt',
      type: 'datetime',
      required: true,
      array: false,
      default: null, // Set to now() on creation
    },
  ],
  indexes: [
    {
      name: 'userId_timestamp',
      type: 'key',
      attributes: ['userId', 'timestamp'],
      orders: ['ASC', 'DESC'],
    },
    {
      name: 'userId_contactId_timestamp',
      type: 'key',
      attributes: ['userId', 'contactId', 'timestamp'],
      orders: ['ASC', 'ASC', 'DESC'],
    },
    {
      name: 'userId_actionId_timestamp',
      type: 'key',
      attributes: ['userId', 'actionId', 'timestamp'],
      orders: ['ASC', 'ASC', 'DESC'],
    },
    {
      name: 'userId_channel',
      type: 'key',
      attributes: ['userId', 'channel'],
      orders: ['ASC', 'ASC'],
    },
    {
      name: 'linkedCardId',
      type: 'key',
      attributes: ['linkedCardId'],
      orders: ['ASC'],
    },
  ],
} as const;

// ============================================================================
// Collection 2: ContextTokens Configuration
// ============================================================================

export const CONTEXT_TOKENS_SCHEMA = {
  collectionName: 'ContextTokens',
  permissions: {
    read: 'user:{userId}', // Via contactId ownership
    create: 'system', // Token extraction service only
    update: 'none', // Immutable
    delete: 'system', // TTL cleanup
  },
  attributes: [
    // Core Fields
    {
      key: 'contactId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'tokenType',
      type: 'string',
      size: 50,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'tokenValue',
      type: 'string',
      size: 500,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'confidence',
      type: 'float',
      required: true,
      array: false,
      default: 1.0,
    },

    // Source Tracking
    {
      key: 'sourceActionId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'isPremiumToken',
      type: 'boolean',
      required: true,
      array: false,
      default: false,
    },

    // Lifecycle
    {
      key: 'createdAt',
      type: 'datetime',
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'expiresAt',
      type: 'datetime',
      required: true,
      array: false,
      default: null, // Set to createdAt + 90 days
    },

    // Metadata
    {
      key: 'metadata',
      type: 'string',
      size: 1000,
      required: true,
      array: false,
      default: '{}',
    },
  ],
  indexes: [
    {
      name: 'contactId_expiresAt',
      type: 'key',
      attributes: ['contactId', 'expiresAt'],
      orders: ['ASC', 'DESC'],
    },
    {
      name: 'contactId_tokenType_createdAt',
      type: 'key',
      attributes: ['contactId', 'tokenType', 'createdAt'],
      orders: ['ASC', 'ASC', 'DESC'],
    },
    {
      name: 'contactId_isPremiumToken',
      type: 'key',
      attributes: ['contactId', 'isPremiumToken'],
      orders: ['ASC', 'ASC'],
    },
    {
      name: 'tokenType_tokenValue',
      type: 'key',
      attributes: ['tokenType', 'tokenValue'],
      orders: ['ASC', 'ASC'],
    },
    {
      name: 'expiresAt',
      type: 'key',
      attributes: ['expiresAt'],
      orders: ['ASC'],
    },
  ],
} as const;

// ============================================================================
// Collection 3: ContactScores Configuration
// ============================================================================

export const CONTACT_SCORES_SCHEMA = {
  collectionName: 'ContactScores',
  permissions: {
    read: 'user:{userId}',
    create: 'system', // Score calculation service only
    update: 'system', // Score calculation service only
    delete: 'user:{userId}', // Cascade when contact deleted
  },
  attributes: [
    // Core Fields
    {
      key: 'userId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'contactId',
      type: 'string',
      size: 255,
      required: true,
      array: false,
      default: null,
    },

    // Score Data
    {
      key: 'currentScore',
      type: 'float',
      required: true,
      array: false,
      default: 0,
    },
    {
      key: 'peakScore',
      type: 'float',
      required: true,
      array: false,
      default: 0,
    },

    // Timing
    {
      key: 'lastActionTimestamp',
      type: 'datetime',
      required: false,
      array: false,
      default: null,
    },
    {
      key: 'lastUpdated',
      type: 'datetime',
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'decayStartedAt',
      type: 'datetime',
      required: false,
      array: false,
      default: null,
    },

    // Metadata
    {
      key: 'totalActions',
      type: 'integer',
      required: true,
      array: false,
      default: 0,
    },
    {
      key: 'positiveActions',
      type: 'integer',
      required: true,
      array: false,
      default: 0,
    },
    {
      key: 'negativeActions',
      type: 'integer',
      required: true,
      array: false,
      default: 0,
    },

    // Audit
    {
      key: 'createdAt',
      type: 'datetime',
      required: true,
      array: false,
      default: null,
    },
    {
      key: 'updatedAt',
      type: 'datetime',
      required: true,
      array: false,
      default: null,
    },
  ],
  indexes: [
    {
      name: 'userId_currentScore',
      type: 'key',
      attributes: ['userId', 'currentScore'],
      orders: ['ASC', 'DESC'],
    },
    {
      name: 'userId_contactId_unique',
      type: 'unique',
      attributes: ['userId', 'contactId'],
      orders: ['ASC', 'ASC'],
    },
    {
      name: 'userId_lastActionTimestamp',
      type: 'key',
      attributes: ['userId', 'lastActionTimestamp'],
      orders: ['ASC', 'DESC'],
    },
    {
      name: 'currentScore',
      type: 'key',
      attributes: ['currentScore'],
      orders: ['DESC'],
    },
  ],
} as const;

// ============================================================================
// Helper: Validate Environment Variables
// ============================================================================

/**
 * Validates that all required Contact Score environment variables are set.
 * Call this on app initialization to fail fast if misconfigured.
 *
 * @throws Error if any required env var is missing
 */
export function validateContactScoreEnv(): void {
  const required = [
    'EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID',
    'EXPO_PUBLIC_APPWRITE_CONTEXT_TOKENS_TABLE_ID',
    'EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Contact Score environment variables: ${missing.join(', ')}\n` +
        'Please ensure these are set in your .env file.\n' +
        'See docs/ContactScore_Schema.md for details.'
    );
  }
}

// ============================================================================
// Helper: Collection Setup Instructions
// ============================================================================

export const SETUP_INSTRUCTIONS = `
# Contact Score System - Appwrite Setup Instructions

## Step 1: Create Collections

### Via Appwrite Console:

1. Navigate to your Appwrite project > Databases > Your Database
2. Create three new collections with these names:
   - ActionEvents
   - ContextTokens
   - ContactScores

### Via Appwrite CLI (preferred):

\`\`\`bash
# Install Appwrite CLI if not already installed
npm install -g appwrite-cli

# Login to Appwrite
appwrite login

# Set your project
appwrite client --endpoint https://your-appwrite-endpoint --projectId your-project-id

# Create collections (replace YOUR_DATABASE_ID)
appwrite databases createCollection \\
  --databaseId YOUR_DATABASE_ID \\
  --collectionId unique() \\
  --name "ActionEvents" \\
  --permissions read('user:*') create('user:*')

appwrite databases createCollection \\
  --databaseId YOUR_DATABASE_ID \\
  --collectionId unique() \\
  --name "ContextTokens" \\
  --permissions read('user:*')

appwrite databases createCollection \\
  --databaseId YOUR_DATABASE_ID \\
  --collectionId unique() \\
  --name "ContactScores" \\
  --permissions read('user:*')
\`\`\`

## Step 2: Add Attributes

For each collection, add all attributes as specified in contactScore.appwrite.config.ts.

**Important:** Ensure data types and sizes match exactly.

## Step 3: Create Indexes

Create all indexes as specified in the config file. Indexes are critical for query performance.

## Step 4: Set Permissions

Configure Row Level Security (RLS) permissions:

- ActionEvents: read/create by user:{userId}
- ContextTokens: read by user (via contactId ownership), create/delete by system
- ContactScores: read by user:{userId}, create/update/delete by system

## Step 5: Add Environment Variables

Add the collection IDs to your .env file:

\`\`\`env
EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID=your_action_events_collection_id
EXPO_PUBLIC_APPWRITE_CONTEXT_TOKENS_TABLE_ID=your_context_tokens_collection_id
EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID=your_contact_scores_collection_id
\`\`\`

## Step 6: Test with Sample Data

Create a few test documents to ensure everything is working:

\`\`\`typescript
// Test ActionEvent
await tablesDB.createRow({
  databaseId: DATABASE_ID,
  tableId: CONTACT_SCORE_COLLECTIONS.ACTION_EVENTS,
  rowId: ID.unique(),
  data: {
    userId: 'test_user_123',
    contactId: 'test_contact_456',
    actionId: 'outcome_sent',
    timestamp: new Date().toISOString(),
    basePoints: 1,
    multipliersApplied: '{}',
    finalPoints: 1,
    channel: 'sms',
    customizationLevel: '',
    isMultiContact: false,
    linkedCardId: '',
    metadata: '{}',
    createdAt: new Date().toISOString(),
  },
});
\`\`\`

## Step 7: Verify Indexes

Run a query on each collection to ensure indexes are being used:

\`\`\`typescript
// Should use userId_timestamp index
await tablesDB.listRows({
  databaseId: DATABASE_ID,
  tableId: CONTACT_SCORE_COLLECTIONS.ACTION_EVENTS,
  queries: [
    Query.equal('userId', 'test_user_123'),
    Query.orderDesc('timestamp'),
  ],
});
\`\`\`

Check Appwrite logs to confirm index usage.

## Step 8: Set Up Cleanup Jobs

Create an Appwrite Function to clean up expired tokens:

\`\`\`javascript
// Appwrite Function: cleanupExpiredTokens
// Schedule: Daily at 2am
// Runtime: Node.js

import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const now = new Date().toISOString();
    const expiredTokens = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.CONTEXT_TOKENS_TABLE_ID,
      [Query.lessThan('expiresAt', now), Query.limit(100)]
    );

    for (const token of expiredTokens.documents) {
      await databases.deleteDocument(
        process.env.DATABASE_ID,
        process.env.CONTEXT_TOKENS_TABLE_ID,
        token.$id
      );
    }

    log(\`Cleaned up \${expiredTokens.total} expired tokens\`);
    return res.json({ deleted: expiredTokens.total });
  } catch (err) {
    error(err.message);
    return res.json({ error: err.message }, 500);
  }
};
\`\`\`

---

For full schema documentation, see: docs/ContactScore_Schema.md
` as const;
