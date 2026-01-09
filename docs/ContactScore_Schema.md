# Contact Score System - Appwrite Schema

## Overview

The Contact Score system replaces the RHS (Relationship Health Score) with a comprehensive point-based scoring engine and context token bank. It consists of three interconnected Appwrite collections that track user actions, extract context tokens, and maintain real-time contact scores.

**System Formula:**
```
Contact Score = (Intent + Interaction Quality + Reciprocity + Context Richness + Cadence Fit + Fresh) × Multipliers − Penalties
```

**Scale:** 0–100 per 90-day rolling window

---

## Collection 1: ActionEvents

### Collection Name
`ActionEvents`

### Collection ID
Store in `.env` as: `EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID`

### Purpose
Stores every user action across the app (60+ action types) with point calculations and context metadata. This is the source of truth for all scoring calculations.

### Permissions
- **Read**: `user:{userId}`
- **Create**: `user:{userId}`
- **Update**: None (immutable after creation)
- **Delete**: `user:{userId}` (for user data deletion only)

### Attributes

#### Core Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| userId | string | 255 | ✓ | - | ✓ |
| contactId | string | 255 | ✓ | - | ✓ |
| actionId | string | 100 | ✓ | - | ✓ |
| timestamp | datetime | - | ✓ | now() | ✓ |

**Notes:**
- `userId`: Clerk user ID
- `contactId`: ProfileContacts.$id (primary contact for multi-contact actions)
- `actionId`: One of 60+ ActionId enum values (see contactScore.types.ts)
- `timestamp`: When the action occurred (used for 90-day window, decay, fatigue caps)

#### Point Calculation

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| basePoints | float | - | ✓ | - | - |
| multipliersApplied | string | 500 | ✓ | "{}" | - |
| finalPoints | float | - | ✓ | - | - |

**Notes:**
- `basePoints`: Points before multipliers (from BASE_POINTS constant)
- `multipliersApplied`: JSON object with applied multipliers, e.g., `{"channelDepth": 1.3, "customization": 1.1}`
- `finalPoints`: Points after all multipliers applied (what gets added to score)

#### Context Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| channel | string | 50 | - | "" | ✓ |
| customizationLevel | string | 50 | - | "" | - |
| isMultiContact | boolean | - | ✓ | false | - |
| linkedCardId | string | 255 | - | "" | ✓ |
| metadata | string | 2000 | ✓ | "{}" | - |

**Notes:**
- `channel`: "sms" | "email" | "slack" | "call" | "facetime" (for channel-related actions)
- `customizationLevel`: "untouched" | "light" | "heavy" | "custom" (for draft actions)
- `isMultiContact`: True for group notes, intros (triggers group/intro multiplier)
- `linkedCardId`: Deck card that triggered this action
- `metadata`: JSON string for action-specific data (e.g., edit distance, outcome type, etc.)

#### Audit Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| createdAt | datetime | - | ✓ | now() | ✓ |

### Indexes

1. **userId_timestamp**
   - Type: Key
   - Attributes: `userId` (ASC), `timestamp` (DESC)
   - Use: Main query for user's action history

2. **userId_contactId_timestamp**
   - Type: Key
   - Attributes: `userId` (ASC), `contactId` (ASC), `timestamp` (DESC)
   - Use: Get all actions for a specific contact (for score breakdown)

3. **userId_actionId_timestamp**
   - Type: Key
   - Attributes: `userId` (ASC), `actionId` (ASC), `timestamp` (DESC)
   - Use: Analytics on specific action types

4. **userId_channel**
   - Type: Key
   - Attributes: `userId` (ASC), `channel` (ASC)
   - Use: Channel-specific analytics, diversity penalty checks

5. **linkedCardId**
   - Type: Key
   - Attributes: `linkedCardId` (ASC)
   - Use: Find actions related to specific deck card

### Query Patterns

#### Get all actions for a contact in 90-day window
```typescript
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
Query.equal("userId", userId),
Query.equal("contactId", contactId),
Query.greaterThan("timestamp", ninetyDaysAgo),
Query.orderDesc("timestamp")
```

#### Check fatigue cap (last 48 hours)
```typescript
const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
Query.equal("userId", userId),
Query.equal("contactId", contactId),
Query.greaterThan("timestamp", fortyEightHoursAgo),
Query.orderDesc("timestamp")
```

#### Get recent actions by type
```typescript
Query.equal("userId", userId),
Query.equal("actionId", "outcome_replied"),
Query.greaterThan("timestamp", sinceDate),
Query.limit(100)
```

### Example Document

```json
{
  "$id": "action_abc123",
  "userId": "clerk_xyz789",
  "contactId": "contact_456",
  "actionId": "outcome_replied",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "basePoints": 10,
  "multipliersApplied": "{\"channelDepth\": 1.15}",
  "finalPoints": 11.5,
  "channel": "email",
  "customizationLevel": "",
  "isMultiContact": false,
  "linkedCardId": "card_789",
  "metadata": "{\"outcomeType\": \"positive\", \"latencyDays\": 2}",
  "createdAt": "2025-01-15T14:30:00.000Z"
}
```

---

## Collection 2: ContextTokens

### Collection Name
`ContextTokens`

### Collection ID
Store in `.env` as: `EXPO_PUBLIC_APPWRITE_CONTEXT_TOKENS_TABLE_ID`

### Purpose
Stores extracted context tokens from messages, notes, and meetings. Tokens are used to condition AI drafts and make next-time messages smarter. Premium users earn tokens from Email/Slack/Calendar actions.

### Permissions
- **Read**: `user:{userId}` (implicit via contactId ownership)
- **Create**: System only (via token extraction service)
- **Update**: None (immutable after creation)
- **Delete**: Automatic via TTL on `expiresAt`

### Attributes

#### Core Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| contactId | string | 255 | ✓ | - | ✓ |
| tokenType | string | 50 | ✓ | - | ✓ |
| tokenValue | string | 500 | ✓ | - | ✓ |
| confidence | float | - | ✓ | 1.0 | - |

**Notes:**
- `contactId`: ProfileContacts.$id
- `tokenType`: "people" | "company" | "topic" | "occasion" | "location" | "preference" | "commitment" | "referral" | "sentiment" | "artifact" | "cadence_hint"
- `tokenValue`: The actual extracted token (normalized, lowercased)
- `confidence`: 0-1 score from NLP extraction (higher = more confident)

#### Source Tracking

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| sourceActionId | string | 255 | ✓ | - | ✓ |
| isPremiumToken | boolean | - | ✓ | false | ✓ |

**Notes:**
- `sourceActionId`: ActionEvents.$id that generated this token
- `isPremiumToken`: True if from Email/Slack/Calendar/Occasion action (premium only)

#### Lifecycle

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| createdAt | datetime | - | ✓ | now() | ✓ |
| expiresAt | datetime | - | ✓ | - | ✓ |

**Notes:**
- `createdAt`: When token was extracted
- `expiresAt`: 90 days from createdAt (use Appwrite TTL or manual cleanup)

#### Metadata

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| metadata | string | 1000 | ✓ | "{}" | - |

**Notes:**
- `metadata`: JSON for token-specific data (e.g., `{"dueDate": "2025-02-01"}` for commitments)

### Indexes

1. **contactId_expiresAt**
   - Type: Key
   - Attributes: `contactId` (ASC), `expiresAt` (DESC)
   - Use: Get active tokens for contact, sorted by freshness

2. **contactId_tokenType_createdAt**
   - Type: Key
   - Attributes: `contactId` (ASC), `tokenType` (ASC), `createdAt` (DESC)
   - Use: Get recent tokens by type (for AI draft conditioning)

3. **contactId_isPremiumToken**
   - Type: Key
   - Attributes: `contactId` (ASC), `isPremiumToken` (ASC)
   - Use: Count premium vs free tokens

4. **tokenType_tokenValue**
   - Type: Key
   - Attributes: `tokenType` (ASC), `tokenValue` (ASC)
   - Use: Deduplicate tokens before insertion

5. **expiresAt**
   - Type: Key
   - Attributes: `expiresAt` (ASC)
   - Use: Batch delete expired tokens

### Token Cap Logic

- **Max tokens per contact:** 50 per 90-day window
- **Enforcement:** Before inserting new token, query count and delete oldest if at cap
- **Priority deletion:** Delete lowest confidence tokens first

### Query Patterns

#### Get active tokens for AI draft conditioning
```typescript
const now = new Date().toISOString();
Query.equal("contactId", contactId),
Query.greaterThan("expiresAt", now),
Query.orderDesc("createdAt"),
Query.limit(10) // Top 10 most recent
```

#### Count tokens to check cap
```typescript
const now = new Date().toISOString();
Query.equal("contactId", contactId),
Query.greaterThan("expiresAt", now)
// Get total, check if >= 50
```

#### Get tokens by type
```typescript
const now = new Date().toISOString();
Query.equal("contactId", contactId),
Query.equal("tokenType", "topic"),
Query.greaterThan("expiresAt", now),
Query.orderDesc("confidence")
```

### Example Document

```json
{
  "$id": "token_abc123",
  "contactId": "contact_456",
  "tokenType": "topic",
  "tokenValue": "fundraising",
  "confidence": 0.92,
  "sourceActionId": "action_789",
  "isPremiumToken": false,
  "createdAt": "2025-01-15T14:30:00.000Z",
  "expiresAt": "2025-04-15T14:30:00.000Z",
  "metadata": "{\"context\": \"Discussed Series A fundraising strategy\"}"
}
```

---

## Collection 3: ContactScores

### Collection Name
`ContactScores`

### Collection ID
Store in `.env` as: `EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID`

### Purpose
Maintains the real-time contact score for each contact. Updated on-the-fly whenever an action event is created. Used for deck prioritization and UI display.

### Permissions
- **Read**: `user:{userId}`
- **Create**: System only (via score calculation service)
- **Update**: System only (via score calculation service)
- **Delete**: `user:{userId}` (cascade when contact deleted)

### Attributes

#### Core Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| userId | string | 255 | ✓ | - | ✓ |
| contactId | string | 255 | ✓ | - | ✓ |

**Notes:**
- `userId`: Clerk user ID
- `contactId`: ProfileContacts.$id (unique per user)

#### Score Data

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| currentScore | float | - | ✓ | 0 | ✓ |
| peakScore | float | - | ✓ | 0 | - |

**Notes:**
- `currentScore`: Current score after decay applied (0-100)
- `peakScore`: Highest score achieved in 90-day window (for analytics)

#### Timing

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| lastActionTimestamp | datetime | - | - | null | ✓ |
| lastUpdated | datetime | - | ✓ | now() | ✓ |
| decayStartedAt | datetime | - | - | null | - |

**Notes:**
- `lastActionTimestamp`: Timestamp of most recent ActionEvent (for recency checks)
- `lastUpdated`: When score was last recalculated (for staleness detection)
- `decayStartedAt`: When decay began (day 14 after last action), null if no decay yet

#### Metadata

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| totalActions | integer | - | ✓ | 0 | - |
| positiveActions | integer | - | ✓ | 0 | - |
| negativeActions | integer | - | ✓ | 0 | - |

**Notes:**
- `totalActions`: Count of all ActionEvents in 90-day window
- `positiveActions`: Actions with finalPoints > 0
- `negativeActions`: Actions with finalPoints < 0

#### Audit

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| createdAt | datetime | - | ✓ | now() | ✓ |
| updatedAt | datetime | - | ✓ | now() | ✓ |

### Indexes

1. **userId_currentScore**
   - Type: Key
   - Attributes: `userId` (ASC), `currentScore` (DESC)
   - Use: Deck prioritization (get highest scored contacts)

2. **userId_contactId**
   - Type: Key (UNIQUE)
   - Attributes: `userId` (ASC), `contactId` (ASC)
   - Use: Upsert pattern, ensure one score per contact per user

3. **userId_lastActionTimestamp**
   - Type: Key
   - Attributes: `userId` (ASC), `lastActionTimestamp` (DESC)
   - Use: Find recently active contacts

4. **currentScore**
   - Type: Key
   - Attributes: `currentScore` (DESC)
   - Use: Global leaderboard (cross-user analytics)

### Score Calculation Logic

#### On Action Event Creation
1. Query all ActionEvents for contactId in 90-day window
2. Sum all `finalPoints` to get raw score
3. Apply time decay if `daysSinceLastAction >= 14`:
   - Decay rate: 1% per day after day 14
   - Floor: 25% of peak score
4. Update ContactScore document (upsert):
   - `currentScore` = calculated score
   - `peakScore` = max(peakScore, currentScore)
   - `lastActionTimestamp` = action.timestamp
   - `lastUpdated` = now()
   - `decayStartedAt` = if daysSinceLastAction == 14, set to now()
   - Increment counters (totalActions, positiveActions, negativeActions)

#### On Score Read (UI Display)
1. Check `lastUpdated` timestamp
2. If stale (>24h), recalculate on-the-fly:
   - Query ActionEvents for 90-day window
   - Recalculate score with current decay
   - Update ContactScore document

### Query Patterns

#### Get score for contact
```typescript
Query.equal("userId", userId),
Query.equal("contactId", contactId),
Query.limit(1)
```

#### Get top scored contacts for deck
```typescript
Query.equal("userId", userId),
Query.orderDesc("currentScore"),
Query.limit(10)
```

#### Get contacts needing score recalculation
```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
Query.equal("userId", userId),
Query.lessThan("lastUpdated", oneDayAgo),
Query.limit(50)
```

### Example Document

```json
{
  "$id": "score_abc123",
  "userId": "clerk_xyz789",
  "contactId": "contact_456",
  "currentScore": 78.5,
  "peakScore": 92.3,
  "lastActionTimestamp": "2025-01-15T14:30:00.000Z",
  "lastUpdated": "2025-01-15T14:30:05.000Z",
  "decayStartedAt": null,
  "totalActions": 42,
  "positiveActions": 38,
  "negativeActions": 4,
  "createdAt": "2024-12-01T10:00:00.000Z",
  "updatedAt": "2025-01-15T14:30:05.000Z"
}
```

---

## Environment Variables

Add these to your `.env` file:

```env
# Contact Score System Collections
EXPO_PUBLIC_APPWRITE_ACTION_EVENTS_TABLE_ID=your_action_events_collection_id
EXPO_PUBLIC_APPWRITE_CONTEXT_TOKENS_TABLE_ID=your_context_tokens_collection_id
EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID=your_contact_scores_collection_id
```

---

## Migration Checklist

### Pre-Migration
- [ ] Create all three collections in Appwrite console
- [ ] Add all attributes as specified above
- [ ] Create all indexes for optimal query performance
- [ ] Set up RLS permissions for user-level isolation
- [ ] Add environment variables to `.env`
- [ ] Install NLP library (compromise.js or wink-nlp)

### Migration Script
- [ ] Create initial ContactScore documents for all existing contacts (score = 0)
- [ ] Backfill ActionEvents from existing EngagementEvents table:
  - Map "sms_sent" → "composer_opened" + "outcome_sent"
  - Map "call_made" → "call_placed"
  - Map "note_added" → "note_manual"
- [ ] Run token extraction on all existing notes and outcome notes
- [ ] Recalculate all ContactScores based on backfilled actions

### Post-Migration
- [ ] Remove all RHS-related code and types
- [ ] Update Deck algorithm to use ContactScore
- [ ] Update UI to display ContactScore instead of RHS
- [ ] Test score calculations with sample data
- [ ] Monitor ActionEvents write volume (should be high-frequency)

---

## Performance Considerations

### Write Volume
- **ActionEvents**: High-frequency writes (every user action)
  - Solution: Use Appwrite batch writes where possible
  - Monitor write limits and add rate limiting if needed

### Query Optimization
- **90-day window queries**: Can be expensive for active users
  - Solution: Use indexed timestamp fields
  - Consider caching score calculations in ContactScores

### Token Cleanup
- **Expired tokens**: Tokens expire after 90 days
  - Solution: Use Appwrite scheduled function to delete where `expiresAt < now()`
  - Run daily at low-traffic time

### Score Staleness
- **Real-time vs batch**: Balance between accuracy and performance
  - Solution: Update on action (real-time), but allow 24h staleness for reads
  - Background job recalculates stale scores

---

## Analytics Enabled

With these collections, you can track:

### Score Analytics
- Score distribution across all users
- Average score by contact source (device, Google, Slack)
- Score trends over time (heatmaps)
- Peak score vs current score delta

### Action Analytics
- Most common actions per user
- Action frequency by time of day
- Channel preference distribution
- Fatigue cap violations (gaming detection)

### Token Analytics
- Token extraction success rate
- Most common topics per user
- Premium token usage
- Token type distribution

### Engagement Analytics
- Actions per contact per month
- Time between actions (cadence adherence)
- Outcome distribution (replied, scheduled, no answer)
- Channel diversity scores
