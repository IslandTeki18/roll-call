# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RollCall is a React Native mobile application built with Expo that helps users maintain relationships in 60 seconds a day. The app presents a daily deck of cards representing people to reach out to, with quick draft messages and one-tap send actions.

## Tech Stack

- **React Native + Expo** (v54) — Cross-platform mobile framework
- **Expo Router** (v6) — File-based navigation system
- **TypeScript** (v5.9) — Type safety
- **NativeWind** (v4.2) + **Tailwind CSS** (v3.4) — Styling
- **Clerk** (v2.19) — Authentication and user management
- **RevenueCat** (v9.6) — Subscription and paywall management
- **Appwrite** (react-native-appwrite) — Backend database (TablesDB API)
- **Expo Contacts** — Native contact access
- **React Native Reanimated** (v4.1) — Animations

## Architecture

### State Management

**Pattern: Custom React Hooks (No global store)**

The app uses hooks-only state management. There is NO Zustand, Redux, or React Query despite documentation suggesting otherwise.

State is managed through:
- `useState()` for component state
- `useCallback()` for memoized functions
- `useEffect()` for side effects
- `useRef()` for refs (autosave timers, etc.)

Key state hooks:
- `useUserProfile()` — User profile state with 30min refresh intervals
- `useNotes()` — Full note CRUD, derives pinned notes/tags from single API call
- `useNoteEditor()` — Individual note editing with 1.5s autosave debounce
- `useOutcome()` — Outcome sheet state, sentiment tracking
- `usePremiumGate()` — Premium feature gating with alert UX

### Data Layer Architecture

**Backend: Appwrite TablesDB (NOT Supabase)**

Configuration: `/features/shared/lib/appwrite.ts`

```typescript
import { Client, Account, Databases, TablesDB } from "react-native-appwrite";

export const client = new Client();
client
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
  .setPlatform("com.landonroney.rollcall");

export const tablesDB = new TablesDB(client);
```

**Database Tables:**
- Profile Contacts — Contact records with dedupeSignature, cadence, RHS metadata
- User Profiles — User account data, premium status
- Engagement Events — All interactions (SMS, call, email, FaceTime, Slack, notes)
- Notes — User notes with AI analysis, tags, pins
- Outcome Notes — Post-engagement notes with sentiment
- Deck Cards — Daily deck persistence
- Deck History — Archive of completed decks
- Context Tokens — Context window management for RHS calculations
- Contact Scores — Persisted RHS metrics

### Service Layer Structure

Feature-based services in `/features/[feature]/api`:

```
auth/api/
  userProfile.service.ts       → Get/create user profile
  premiumCache.service.ts      → AsyncStorage caching

contacts/api/
  contacts.service.ts          → Device contact import, dedup, queries

messaging/api/
  engagement.service.ts        → Event tracking (CRUD)
  recommendations.service.ts   → Channel/tone recommendations
  drafts.service.ts            → Draft templates

notes/api/
  notes.service.ts             → Note CRUD
  notesProcessing.service.ts   → AI processing orchestration
  entityParser.service.ts      → NLP-based entity extraction
  hybridEntityExtraction.service.ts → Deterministic + AI hybrid

outcomes/api/
  outcomeNotes.service.ts      → Outcome CRUD
  aiProcessing.service.ts      → AI sentiment/analysis

deck/api/
  rhs.service.ts               → RHS calculation (complex scoring)
  rhs.cache.ts                 → In-memory RHS cache (5min TTL)
  rhsMetrics.service.ts        → Persist/retrieve RHS metrics
  deckBuilder.service.ts       → Daily deck generation
  deckHistory.service.ts       → Deck archive
  contextTokens.service.ts     → Context window management
  deckArchive.cache.ts         → Archive timing logic
```

**Service Patterns:**
- Direct Appwrite TablesDB API calls
- Try/catch with console.error logging
- Return null/empty arrays on failure
- No retry logic or exponential backoff
- Batch operations with `Promise.all()` for parallel I/O

**Recent Optimizations:**
- Load notes once, derive pinned notes and tags from same dataset
- Limit query results (20 events, 10 outcomes) to reduce data transfer
- Background RHS recalculation when notes created (non-blocking)

### File-Based Architecture

Each feature in `/features/[feature]`:
- `screens/` — Full screen components
- `components/` — Reusable UI components
- `hooks/` — Custom React hooks
- `api/` — Service layer for data fetching
- `types/` — TypeScript type definitions
- `lib/` — Utility functions and configurations

Shared components in `/features/shared/components/`

## Navigation Structure

Expo Router file-based routing:

```
Root (app/_layout.tsx - ClerkProvider + GestureHandlerRootView)
├── (auth) — Not authenticated
│   ├── sign-in
│   └── sign-up
└── (tabs) — Authenticated
    ├── deck (index)
    ├── notes
    ├── contacts
    │   ├── index (list)
    │   └── details
    ├── settings
    └── reports (premium)
```

## Core Domain Concepts

### RHS (Relationship Health Score)

Sophisticated multi-factor scoring system (0-100):

```
RHS = max(0, min(100,
  recencyScore +
  freshnessBoost +
  cadenceWeight +
  engagementQualityBonus +
  conversationDepthBonus -
  fatigueGuardPenalty -
  decayPenalty
))
```

**Components:**
- **RecencyScore** (0-100): Days since last engagement mapped to tiers
- **FreshnessBoost** (+25): New contacts within 14-day window from `firstSeenAt`
- **CadenceWeight** (+30): Based on user-set cadence vs actual intervals
- **EngagementQualityBonus** (+20): Quality of interactions (sentiment, response rates)
- **ConversationDepthBonus** (+15): Number of notes/topics per contact
- **FatigueGuardPenalty** (-20): Contacted too recently (within 3 days)
- **DecayPenalty** (-40): Exponential decay after 30 days: `max_penalty * (1 - e^(-rate * days_overdue))`

**Caching:**
- In-memory cache with 5-minute TTL
- Max 500 entries (evicts oldest 20% when full)
- Invalidation on new engagement

**Performance:**
- Fetches only 20 events, 10 outcomes per contact (optimized limits)
- Parallel fetches with `Promise.all()`
- Filters to "meaningful" engagement types (SMS, call, email, FaceTime, Slack)

Location: `/features/deck/api/rhs.service.ts`

### Cadence System

Users can set custom cadences for contacts:
- Daily, Weekly, Biweekly, Monthly, Quarterly, Annually
- Custom intervals
- Default: 30 days when none set

**Three metrics:**
1. **Cadence Adherence Score**: How well actual intervals match target (0-40 points)
2. **Cadence Consistency Score**: How consistent engagement pattern is (0-20 points)
3. **Cadence Trend Score**: Whether intervals improving/worsening (-10 to +10 points)

Location: `/features/deck/api/cadenceScoring.ts`

### Fresh Contact Handling

**Definition:** Contact is "new" if:
- No engagement recorded (`firstEngagementAt` is empty), AND
- Within 14 days of `firstSeenAt`

**Treatment:** Fresh contacts get 1-2 guaranteed slots in daily deck via `FRESH_MIN`/`FRESH_MAX`

### Deck Building Algorithm

**Two-Path Strategy:**

1. **Fast Path** (new users with no engagement history):
   - Shuffle contacts randomly
   - Prioritize fresh contacts (1-2 slots)
   - Fill remaining slots randomly

2. **Slow Path** (established users):
   - Calculate RHS for all contacts
   - Score and sort by RHS
   - Fill deck (5 free / 10 premium) with top scorers
   - Always include 1-2 fresh contacts if available

**Batching:** Processes 15 contacts at a time during RHS calculation

Location: `/features/deck/api/deckBuilder.service.ts`

### Contact Deduplication

**Strategy:** Generate `dedupeSignature` from normalized fields:
```typescript
signature = [firstName, lastName, phone_digits, email].join("|")
```

When importing device contacts, check signature against existing records.

Location: `/features/contacts/api/contacts.service.ts`

### Engagement Tracking

Records every interaction with metadata:
- Timestamp
- Engagement type: `sms_sent | call_made | email_sent | facetime_made | slack_sent | note_added | card_dismissed | card_snoozed`
- Outcome
- Associated notes
- linkedCardId (if from deck)

Location: `/features/messaging/api/engagement.service.ts`

## Premium Feature Gating

**Three-Tier Caching Strategy:**
1. Local AsyncStorage cache (fast, stale)
2. Clerk user state (real-time, via `@clerk/clerk-expo`)
3. Appwrite profile (`isPremiumUser` boolean)
4. RevenueCat (subscription source of truth)

Refresh interval: 30 minutes

**Premium Features:**
- Extended Deck (10 cards vs 5)
- Reports (analytics, heatmaps, cooling lists)
- Occasions (birthday/milestone reminders)
- Sources (Google, Microsoft, Slack OAuth integrations)
- Advanced Messaging (email, Slack send capabilities)

## Cloud Functions

Three Appwrite Functions deployed as JavaScript:

1. **ai-engine** — Core AI processing for notes/outcomes (OpenAI API)
2. **openai-draft-generator** — Message draft generation
3. **revenuecat-webhook** — Subscription sync to Appwrite

Functions called via HTTP endpoints (environment variables)

## Code Style

- TypeScript strict mode enabled
- ESLint configuration via `eslint-config-expo`
- Functional components with hooks
- NativeWind utility classes for styling
- Tailwind config in `tailwind.config.js`
- Global styles in `global.css`

## Design Principles

1. **Finishable, not infinite** — Small daily decks create sustainable habits
2. **Manual over magic** — AI suggests, but users stay in control
3. **Context receipts** — Notes and outcomes provide memory
4. **Privacy-first** — Export/delete available, no auto-sending
5. **Calm UX** — Nudges support consistency without anxiety

## Key Files Reference

- `/app/_layout.tsx` — Root layout with ClerkProvider and GestureHandlerRootView
- `/features/shared/lib/appwrite.ts` — Appwrite client configuration
- `/features/auth/hooks/usePremiumGate.ts` — Premium feature gating
- `/features/auth/hooks/useUserProfile.ts` — User profile management
- `/features/contacts/api/contacts.service.ts` — Contact data layer
- `/features/deck/api/rhs.service.ts` — RHS calculation system
- `/features/deck/api/deckBuilder.service.ts` — Daily deck generation
- `/features/notes/hooks/useNotes.ts` — Note state management
- `/features/contacts/components/ContactCard.tsx` — Main contact display component


## Notes for AI Assistants

- Always check premium status before accessing premium features
- Use the service layer (`*.service.ts`) for data operations
- Follow the feature-based architecture when adding new functionality
- Maintain TypeScript type safety
- Respect the privacy-first design principle
- Keep the UI calm and focused on the core habit loop
- The app uses **Appwrite TablesDB**, NOT Supabase (documentation discrepancy)
- State is managed through **hooks only** (no Zustand or React Query despite README)
- RHS calculation is the core algorithmic complexity — understand it before modifying deck logic
- Premium gating uses `usePremiumGate()` hook with alert UX
- All environment variables must be prefixed with `EXPO_PUBLIC_` for React Native access
