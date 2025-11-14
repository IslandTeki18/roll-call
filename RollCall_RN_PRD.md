# RollCall — Product Requirements Document (PRD)

## Summary
RollCall keeps your network warm in 60 seconds a day. Users swipe a tiny deck of smart touch cards (5 free /
10 premium), send one-tap messages across channels, and build AI-assisted notes that remember context.
This PRD specifies the React Native/Expo implementation: iOS first, Android-ready. Premium unlocks
external sources (Google/Outlook/Slack), richer channels (email/Slack send), and user-facing Reports.

## Key Success Metrics:
- **North Star:** Percent of users who complete their daily deck and log context (notes) consistently.

- **Activation:** 
    * A1: % who complete first deck AND create first note within 24h.
    * A2: Median time-to-first touch on Fresh contacts (days).

- **Engagement & Retention:** 
    * E1: Deck completion rate.
    * E2: Touches per user/week. 
    * E3: D1/D7 retention (deck completed).
    * E4: AI draft adoption rate.

- **Monetization:**
    * M1: Premium conversion within 14 days. 
    * M2: Premium 30-day churn. 
    * M3: Report usage among Premium (% opening Reports ≥2×/week).

- **Quality & Reliability:** 
    * Q1: Crash-free sessions ≥ 99.5%. 
    * Q2: Draft latency—cached <1s, cold <2.5s. 
    * Q3: Email/Slack send success ≥ 98%.

## What Hypotheses the Team is Testing
- Tiny decks (5 free / 10 premium) drive higher completion and retention versus larger queues.
- Fresh Connections (newly ingested contacts) surfaced explicitly decrease time-to-first-touch and increase engagement.
- Notes-as-memory (manual + AI summaries/next steps) compensates for missing platform signals and creates habit in freemium.
- Premium unlocks (external sources + Reports + email/Slack send) create clear upgrade moments and lift conversion

## The User Problem or Need Being Solved
- Relationship decay from missed follow-ups; new intros go cold.
- Friction to act: writing relevant messages and picking channels is slow.
- Context is scattered (Notes app, CRM, memory).
- Overwhelm: long to-do lists reduce momentum—users need a tiny, finishable loop.
- iOS/Android constraints: SMS/call logs are restricted—recency tracking must be explicit.

**Solution:**
    A tiny daily deck; AI-ready, contact-attached notes; Fresh prioritization; one-tap messages; and premium upgrade paths.

## Evidence for the Choice Made
- Micro-loop products demonstrate that small, game-like loops sustain daily behavior.
- Networking pain is universal across founders, creators, sales pros, and job-seekers.
- Platform constraints (social graphs & native message logs) make Notes + explicit outcomes a proven workaround for reliable recency signals.
- Upgrade triggers (email/Slack connect, Reports) are high-intent actions in similar productivity apps and correlate with conversion.
- React Native + Expo with RevenueCat, Supabase, and AuthSession is a proven stack for fast cross-platform shipping.

## Guidance for Design & Engineering
### Scope (v1.0 Must-haves)
***Freemium***
- Sources: Device Contacts (expo-contacts).
- Deck: 5 cards/day (hard cap).
- Channels: SMS/iMessage compose, Call, FaceTime (iOS), Android intents for SMS/Call.
- Notes: manual & multi-contact; tags, pins, voice-to-text; search.
- AI on Notes: 2-line summary, entities, suggested Next-CTA/Next-Due (edge function).
- Fresh Connections: firstSeen at ingest; Fresh if ≤14 days & no interactions; NEW pill; RHS +25 decaying to 0 by day 21 or after first touch.
- RHS (free): Recency decay + cadence fit + tag priority + manual mutuality + fatigue guard + Fresh boost.
- Quiet hours + daily nudge (expo-notifications).

***Premium***
- Sources: Google People/Contacts, Microsoft Graph (People), Slack (DMs) via AuthSession + edge
functions.
- Deck: 10 cards/day.
- Channels: Email send (Gmail/Outlook via edge), Slack DM send; deep-link compose for Telegram/WhatsApp/LinkedIn/X.
- Reports: Overview, By Tag, Overdue Heatmap, Cooling (RHS fallers), Fresh Handling, Streaks.
- Occasions: birthdays/work anniversaries from Google/Microsoft.

### Design Principles
- Finishable, not infinite: always 5/10 cards; no 'load more.'
- Two taps to done: Draft → Send → Outcome Sheet (with optional 140-char note).
- Fresh gets spotlight: always ≥1 Fresh (cap 2/day), with clear NEW pill and microcopy.
- Context receipts: drafts display why (intro source, last touch).
- Manual over magic: users can create/edit notes; AI suggests, doesn’t override.
- Calm UI: supportive streaks; avoid anxiety language.
- Privacy-forward: clear scopes, no auto-sending, simple export/delete.

### Information Architecture & Primary Flows
- Onboarding → Contacts permission → quick-tag + cadence presets → (paywall) connect Google/Outlook/Slack via AuthSession → allow notifications.
- Daily Deck → pick a card → choose a draft (2 options) → send (native/API) → Outcome Sheet → Note auto-created → RHS recalculated.
- Notes → create from contact/deck/global; attach to one or many contacts; tag/pin; AI summary & next steps show on contact.
- Reports (Premium) → tiles first; tap into lists; queue items into tomorrow’s deck.

### Engineering Guardrails & Choices
- Framework: React Native + Expo Dev Client (config plugins) + NativeWind (Tailwind for React Native).
- State/Data: React Query + Zustand; local DB: SQLite (expo-sqlite), optional Drizzle ORM.
- Backend: Supabase (Postgres + RLS) + edge functions for AI and mail/slack sends.
- IAP: RevenueCat (trials, receipts, cross-platform entitlements).
- Auth/OAuth: Expo AuthSession (Google/MS/Slack) with PKCE; tokens stored in SecureStore; server holds refresh tokens encrypted.
- Notifications: expo-notifications; Background tasks: expo-background-fetch + expo-task-manager.
- Messaging bridges: react-native-message-compose (iOS SMS), expo-mail-composer, Linking for tel/facetime/deeplinks.
- RHS calc & Fresh decay: pure TS utilities; firstSeen is stamped at ingestion (do not rely on platform
createdDate).
- Security: minimal scopes; field-level encryption for PII synced to server; no auto-sending; export delete in-app.
- Performance targets: deck render <300ms cached; draft cold <2.5s; reports <500ms; crash-free ≥99.5%.

### Paywall Strategy
- RevenueCat offerings: Premium Monthly & Annual (7-day trial).
- Upgrade moments: external source connect; attempt email/Slack send; open Reports; try to expand deck
from 5 → 10.
- Copy: “Unlock 10-card deck, email/Slack sends, and your Fresh Handling report.”

### Initial Experiments (30–60 days)
- Deck size sensitivity: 5 vs 7 (free) on D7 retention (default remains 5).
- Paywall headline variants: Benefits-first vs Outcomes-first.
- Fresh window: 14 vs 10 days on time-to-first touch.
- Draft count: 1 vs 2 drafts on send rate & latency.

### Out-of-Scope (v1.0) & Acceptance Criteria
- Out-of-scope: CRM connectors, widgets, desktop builds, WhatsApp Business API send, referral program
(unless trivial).
- Acceptance: Fresh pill behavior correct; deck always shows ≥1 Fresh (cap 2); multi-contact notes;
Outcome Sheet required; 5 core reports gated to Premium; graceful permission denial; privacy labels
accurate; no auto-sending; offline-first writes queue and sync later.