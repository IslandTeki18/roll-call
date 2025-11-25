# OutcomeNotes Table Schema

## Overview
The `OutcomeNotes` table stores user reflections after engagement events (messages sent, calls made, etc.). Each outcome is processed by AI to extract summaries, next steps, entities, and sentiment.

## Appwrite Configuration

### Collection Name
`OutcomeNotes`

### Collection ID
Store in `.env` as: `EXPO_PUBLIC_APPWRITE_OUTCOME_NOTES_TABLE_ID`

### Permissions
- **Read**: `user:{userId}`
- **Create**: `user:{userId}`
- **Update**: `user:{userId}`
- **Delete**: `user:{userId}`

## Attributes

### Core Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| userId | string | 255 | ✓ | - | ✓ |
| rawText | string | 500 | ✓ | - | - |
| userSentiment | string | 50 | ✓ | - | - |
| contactIds | string | 1000 | ✓ | - | ✓ |
| linkedCardId | string | 255 | - | "" | ✓ |
| linkedEngagementEventId | string | 255 | - | "" | ✓ |

**Notes:**
- `rawText`: User's free-form reflection (140 char limit enforced in UI, but allow 500 for flexibility)
- `userSentiment`: Enum values: "positive", "neutral", "negative", "mixed"
- `contactIds`: Comma-separated list of contact IDs
- `linkedCardId`: References deck card that triggered this outcome
- `linkedEngagementEventId`: References the engagement event (sms_sent, call_made, etc.)

### AI Processing Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| aiAnalysisId | string | 255 | - | "" | ✓ |
| processingStatus | string | 50 | ✓ | "pending" | ✓ |
| processingError | string | 1000 | - | "" | - |

**Notes:**
- `aiAnalysisId`: Links to `AIAnalysisLogs.$id` after AI processing completes
- `processingStatus`: Enum values: "pending", "processing", "completed", "failed"
- `processingError`: Error message if AI processing fails

### AI Results (Denormalized)

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| aiSummary | string | 1000 | - | "" | - |
| aiNextSteps | string | 2000 | - | "" | - |
| aiEntities | string | 1000 | - | "" | - |
| aiSentiment | string | 50 | - | "neutral" | - |

**Notes:**
- `aiSummary`: 1-2 sentence AI-generated summary
- `aiNextSteps`: Pipe-separated list of actionable items
- `aiEntities`: Comma-separated list of people/companies/organizations
- `aiSentiment`: AI-detected sentiment (may differ from userSentiment)

### Metadata Fields

| Attribute | Type | Size | Required | Default | Indexed |
|-----------|------|------|----------|---------|---------|
| recordedAt | datetime | - | ✓ | now() | ✓ |
| processedAt | datetime | - | - | - | ✓ |
| createdAt | datetime | - | ✓ | now() | ✓ |
| updatedAt | datetime | - | ✓ | now() | ✓ |

**Notes:**
- `recordedAt`: When user saved the outcome (use for recency sorting)
- `processedAt`: When AI completed processing (use for analytics)
- `createdAt`/`updatedAt`: Standard audit fields

## Indexes

Create the following indexes for optimal query performance:

1. **userId_recordedAt**
   - Type: Key
   - Attributes: `userId` (ASC), `recordedAt` (DESC)
   - Use: Main query pattern for user's outcomes

2. **userId_processingStatus**
   - Type: Key
   - Attributes: `userId` (ASC), `processingStatus` (ASC)
   - Use: Finding pending/failed outcomes for background processing

3. **userId_contactIds**
   - Type: Fulltext
   - Attributes: `contactIds`
   - Use: Finding outcomes for specific contacts

4. **linkedEngagementEventId**
   - Type: Key
   - Attributes: `linkedEngagementEventId` (ASC)
   - Use: Finding outcome linked to specific engagement

5. **linkedCardId**
   - Type: Key
   - Attributes: `linkedCardId` (ASC)
   - Use: Finding outcomes linked to specific deck card

## Relationships

### Direct References
- `userId` → `UserProfiles.clerkUserId`
- `contactIds` → `ProfileContacts.$id` (comma-separated)
- `linkedCardId` → Deck card ID (when deck system is built)
- `linkedEngagementEventId` → `EngagementEvents.$id`
- `aiAnalysisId` → `AIAnalysisLogs.$id`

### Reverse Relationships
- One `OutcomeNote` → One `AIAnalysisLog`
- One `OutcomeNote` → One `EngagementEvent`
- One `OutcomeNote` → Many `ProfileContacts`

## Query Patterns

### Get user's recent outcomes
```typescript
Query.equal("userId", userId),
Query.orderDesc("recordedAt"),
Query.limit(100)
```

### Get pending outcomes for background processing
```typescript
Query.equal("userId", userId),
Query.equal("processingStatus", "pending"),
Query.limit(50)
```

### Get outcomes for a contact
```typescript
Query.equal("userId", userId),
Query.contains("contactIds", contactId),
Query.orderDesc("recordedAt")
```

### Get outcome for engagement event
```typescript
Query.equal("userId", userId),
Query.equal("linkedEngagementEventId", eventId),
Query.limit(1)
```

## Example Document

```json
{
  "$id": "outcome_abc123",
  "userId": "clerk_xyz789",
  "rawText": "Great call! Discussed Q4 budget and agreed to follow up next week with proposal.",
  "userSentiment": "positive",
  "contactIds": "contact_123,contact_456",
  "linkedCardId": "card_789",
  "linkedEngagementEventId": "event_321",
  "aiAnalysisId": "analysis_654",
  "processingStatus": "completed",
  "processingError": "",
  "aiSummary": "Productive discussion about Q4 budget with commitment to send proposal next week.",
  "aiNextSteps": "Send Q4 budget proposal|Schedule follow-up meeting",
  "aiEntities": "Q4 budget,proposal",
  "aiSentiment": "positive",
  "recordedAt": "2025-01-15T14:30:00.000Z",
  "processedAt": "2025-01-15T14:30:05.000Z",
  "createdAt": "2025-01-15T14:30:00.000Z",
  "updatedAt": "2025-01-15T14:30:05.000Z"
}
```

## Migration Notes

1. Create the collection in Appwrite console
2. Add all attributes as specified above
3. Create indexes for optimal performance
4. Set up RLS permissions for user-level isolation
5. Add environment variable to `.env`:
   ```
   EXPO_PUBLIC_APPWRITE_OUTCOME_NOTES_TABLE_ID=your_collection_id
   ```
6. Test with sample data before deploying

## Analytics & Reports

This table enables the following analytics:
- Outcome completion rate per user
- Average outcomes per contact
- Sentiment distribution over time
- Most common next steps
- Processing success rate
- Time between engagement and outcome recording