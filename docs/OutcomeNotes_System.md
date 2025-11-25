# OutcomeNotes System Implementation

## Overview

The OutcomeNotes system provides a structured follow-up mechanism after engagement events in the RollCall app. It captures user reflections, processes them with AI, and produces actionable insights.

## System Architecture

```
┌─────────────────┐
│   User Action   │ (Send SMS/Call/Email)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Engagement      │ (sms_sent, call_made, etc.)
│ Event Created   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OutcomeSheet    │ (User inputs sentiment + note)
│ Drawer Opens    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OutcomeNote     │ (Saved to database)
│ Created         │ Status: "pending"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Processing   │ (Calls AI engine function)
│ Triggered       │ Status: "processing"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Analysis     │ (Summary, next steps, entities)
│ Completed       │ Status: "completed"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OutcomeNote     │ (Updated with AI results)
│ Enriched        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Future: Update  │ (RHS recalculated, Notes created)
│ Related Systems │
└─────────────────┘
```

## Components

### 1. Database Layer

**File:** `services/outcomeNotes.service.ts`

**Key Functions:**
- `createOutcomeNote()` - Creates new outcome with "pending" status
- `updateOutcomeWithAI()` - Updates outcome with AI analysis results
- `markOutcomeAsProcessing()` - Sets status to "processing"
- `markOutcomeAsFailed()` - Sets status to "failed" with error message
- `getOutcomeNote()` - Retrieves single outcome by ID
- `getOutcomeNotesByUser()` - Gets all outcomes for a user
- `getOutcomeNotesByContact()` - Gets outcomes for specific contact
- `getOutcomeNotesByStatus()` - Finds outcomes by processing status

**Data Model:**
```typescript
interface OutcomeNote {
  $id: string;
  userId: string;
  
  // User input
  rawText: string;
  userSentiment: "positive" | "neutral" | "negative" | "mixed";
  
  // Context
  contactIds: string; // comma-separated
  linkedCardId: string;
  linkedEngagementEventId: string;
  
  // AI processing
  aiAnalysisId: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError: string;
  
  // AI results (denormalized)
  aiSummary: string;
  aiNextSteps: string; // pipe-separated
  aiEntities: string; // comma-separated
  aiSentiment: "positive" | "neutral" | "negative" | "mixed";
  
  // Timestamps
  recordedAt: string;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. AI Processing Layer

**File:** `services/aiProcessing.service.ts`

**Key Functions:**
- `processOutcomeWithAI()` - Main processing function
- `processOutcomeWithProgress()` - Processing with progress callbacks
- `batchProcessOutcomes()` - Process multiple outcomes
- `retryFailedOutcome()` - Retry failed processing

**Processing Flow:**
1. Mark outcome as "processing"
2. Call AI engine function with raw text and contact IDs
3. Parse AI response (summary, next steps, entities, sentiment)
4. Update outcome with results and mark as "completed"
5. If error, mark as "failed" with error message

**AI Engine Integration:**
- Endpoint: `EXPO_PUBLIC_AI_ENGINE_ENDPOINT`
- Payload: `{ raw_text, user_id, contact_ids }`
- Response: `{ execution_id, summary, next_steps, entities, sentiment }`

### 3. UI Components

**File:** `components/deck/OutcomeSheet.tsx`

**Props:**
```typescript
interface OutcomeSheetProps {
  visible: boolean;
  onClose: () => void;
  contactIds: string[];
  contactNames: string[];
  linkedCardId?: string;
  linkedEngagementEventId?: string;
  engagementType?: string;
  onComplete?: () => void;
}
```

**Features:**
- Modal drawer with slide-up animation
- Three sentiment buttons (Positive, Neutral, Negative)
- Text input with 140 character limit
- Real-time character counter
- AI processing indicator
- Error handling and display
- Keyboard avoidance
- Save & Skip actions

**User Flow:**
1. User selects sentiment (required)
2. User enters reflection text (required)
3. User taps "Save & Analyze"
4. Shows "AI is analyzing..." state
5. On completion, calls `onComplete()` callback
6. Sheet closes automatically

### 4. React Hook

**File:** `hooks/useOutcome.ts`

**API:**
```typescript
const {
  // Outcome sheet state
  outcomeSheetVisible,
  outcomeConfig,
  showOutcomeSheet,
  hideOutcomeSheet,
  
  // Direct outcome creation
  createOutcome,
  
  // Data loading
  loadContactOutcomes,
  loadUserOutcomes,
  
  // State
  loading,
  error,
} = useOutcome();
```

**Usage Pattern:**
```typescript
// 1. Show outcome sheet after engagement
showOutcomeSheet({
  contactIds: ['123'],
  contactNames: ['John Doe'],
  linkedCardId: 'card-456',
  linkedEngagementEventId: 'event-789',
  engagementType: 'sms_sent'
});

// 2. Render in component
<OutcomeSheet
  visible={outcomeSheetVisible}
  onClose={hideOutcomeSheet}
  contactIds={outcomeConfig?.contactIds || []}
  contactNames={outcomeConfig?.contactNames || []}
  linkedCardId={outcomeConfig?.linkedCardId}
  linkedEngagementEventId={outcomeConfig?.linkedEngagementEventId}
  engagementType={outcomeConfig?.engagementType}
  onComplete={handleOutcomeComplete}
/>
```

## Integration Points

### 1. Deck Flow Integration

When a user completes an engagement action:

```typescript
// After sending message/making call
const engagementEvent = await createEngagementEvent(
  userId,
  'sms_sent',
  [contactId],
  cardId,
  { message: messageText }
);

// Show outcome sheet
showOutcomeSheet({
  contactIds: [contactId],
  contactNames: [contact.displayName],
  linkedCardId: cardId,
  linkedEngagementEventId: engagementEvent.$id,
  engagementType: 'sms_sent'
});
```

### 2. Contact Detail Integration

Display past outcomes on contact detail screens:

```typescript
const { loadContactOutcomes } = useOutcome();
const [outcomes, setOutcomes] = useState<OutcomeNote[]>([]);

useEffect(() => {
  (async () => {
    const data = await loadContactOutcomes(contactId);
    setOutcomes(data);
  })();
}, [contactId]);
```

### 3. Future: Notes Integration

When an outcome is completed with AI analysis:
- Create a Note document with AI summary and next steps
- Link Note to contacts via `contactIds`
- Attach AI-generated tags based on entities

### 4. Future: RHS Updates

After outcome creation:
- Update Relationship Health Score (RHS)
- Factor in sentiment (positive = boost, negative = penalty)
- Update recency timestamp
- Trigger Flash recalculation

## Environment Variables

Add to `.env`:

```bash
# OutcomeNotes table
EXPO_PUBLIC_APPWRITE_OUTCOME_NOTES_TABLE_ID=your_collection_id

# AI Engine endpoint
EXPO_PUBLIC_AI_ENGINE_ENDPOINT=https://your-project.appwrite.global/functions/ai-engine/executions
```

## Database Setup

1. Create `OutcomeNotes` collection in Appwrite
2. Add attributes as specified in `docs/OutcomeNotes_Schema.md`
3. Create indexes:
   - `userId_recordedAt`
   - `userId_processingStatus`
   - `userId_contactIds` (fulltext)
   - `linkedEngagementEventId`
   - `linkedCardId`
4. Set RLS permissions to user-level

## Error Handling

### Network Errors
- If AI engine call fails, outcome is marked as "failed"
- Error message is stored in `processingError`
- User can retry later via `retryFailedOutcome()`

### Validation Errors
- Sentiment is required
- Note text is required (min 1 char)
- Max 140 characters enforced in UI

### Processing Errors
- AI parsing errors are caught and logged
- Outcome status set to "failed"
- Original user input is preserved

## Performance Considerations

### AI Processing
- Processing happens asynchronously
- User can close sheet while AI processes
- Progress callbacks allow UI updates
- Failed outcomes can be batch-retried

### Query Optimization
- Indexed fields for common queries
- Denormalized AI results for fast reads
- Limit queries to prevent over-fetching

### Offline Support
- Outcomes can be created offline (future enhancement)
- Queued for AI processing when online
- Status transitions tracked for retry logic

## Testing Checklist

- [ ] Create outcome note with valid data
- [ ] AI processing completes successfully
- [ ] Outcome marked as "completed" with results
- [ ] Failed processing marks outcome as "failed"
- [ ] Retry failed outcome works
- [ ] OutcomeSheet displays correctly
- [ ] Sentiment selection works
- [ ] Character limit enforced
- [ ] Save button disabled when invalid
- [ ] Skip button closes sheet
- [ ] Loading states display properly
- [ ] Error messages show correctly
- [ ] Contact outcomes load correctly
- [ ] User outcomes load correctly
- [ ] Integration with engagement events works

## Future Enhancements

1. **Offline Support**
   - Queue outcomes for processing when offline
   - Sync when connection restored

2. **Voice Input**
   - Voice-to-text for outcome notes
   - Faster input for mobile users

3. **Smart Suggestions**
   - Pre-fill common outcomes based on history
   - Suggest sentiment based on message content

4. **Outcome Templates**
   - Quick outcomes for common scenarios
   - One-tap outcome recording

5. **Analytics Dashboard**
   - Outcome completion rates
   - Sentiment trends over time
   - Most common next steps

6. **Reminders from Next Steps**
   - Parse next steps for due dates
   - Create reminders automatically
   - Surface in deck at appropriate time

## Support & Troubleshooting

### Common Issues

**AI processing stuck in "processing"**
- Check AI engine function logs
- Verify endpoint URL is correct
- Ensure OpenAI API key is valid

**Outcomes not saving**
- Verify Appwrite permissions
- Check network connectivity
- Validate required fields

**Character limit not enforced**
- Ensure `maxLength` prop is set on TextInput
- Verify state updates correctly

### Debug Commands

```typescript
// Get all pending outcomes
const pending = await getOutcomeNotesByStatus(userId, 'pending');

// Get failed outcomes
const failed = await getOutcomeNotesByStatus(userId, 'failed');

// Retry all failed
await batchProcessOutcomes(failed.map(o => o.$id));
```

## Files Created

1. `services/outcomeNotes.service.ts` - Database operations
2. `services/aiProcessing.service.ts` - AI integration
3. `components/deck/OutcomeSheet.tsx` - UI component
4. `hooks/useOutcome.ts` - React hook
5. `examples/OutcomeSheetUsage.example.tsx` - Usage examples
6. `docs/OutcomeNotes_Schema.md` - Database schema
7. `docs/OutcomeNotes_System.md` - This document

## Next Steps

1. Create OutcomeNotes collection in Appwrite console
2. Add environment variables
3. Test OutcomeSheet component in isolation
4. Integrate with existing deck flow
5. Connect to Notes system when ready
6. Implement RHS updates when ready