# RollCall — React Native Expo Application

RollCall is a mobile app built with **React Native + Expo** designed to help users keep their relationships warm in just 60 seconds a day.  
The app uses a modular architecture where each feature is isolated, making the codebase scalable and easy to extend.

---

## 📱 Core Concept
Users complete a **Daily Deck** of cards representing people they should reach out to.  
Each card offers quick draft messages, one-tap send actions, and context notes to strengthen personal and professional networks.  
Premium users unlock deeper integrations, reporting, and more powerful messaging options.

---

## 🧩 Features

### Deck
- Daily card loop (5 free / 10 premium)
- Pick draft → Send → Outcome Sheet
- Core daily habit driver

### Notes
- Manual + AI-assisted notes
- Summaries, next steps, entity extraction
- Tags, pins, multi-contact attachments

### Contacts
- Unified contact ingestion (device + premium sources)
- Deduplication and merging
- Picker and detail views

### Fresh
- Flags new connections with a **NEW** pill
- RHS (Relationship Health Score) calculation
- Decay and cadence scoring for prioritization

### Messaging
- One-tap sends across SMS, call, FaceTime, email, Slack
- Draft templates per contact
- Native bridges for free users, backend APIs for premium

### Reports *(Premium)*
- Overview and tag-based summaries
- Overdue heatmaps and cooling lists
- Fresh handling and streaks

### Notifications
- Daily nudges to complete the deck
- Quiet hours to avoid disruption
- Background fetch tasks for recency scoring

### Occasions *(Premium)*
- Birthdays, anniversaries, milestones
- Data pulled from Google/Microsoft accounts
- Reminders for timely outreach

### Paywall
- RevenueCat integration for subscriptions
- Unlocks 10-card deck, Reports, email/Slack send, and Occasions
- Supports monthly/annual plans with trials

### Search
- Global search across contacts and notes
- Filter by tags or text
- Attach notes to multiple contacts directly from search

### Onboarding
- Walks users through permissions
- Tag and cadence presets
- Source connections and notification setup

### Settings
- App and notification preferences
- Privacy tools for export and delete
- Transparent permission management

### Sources *(Premium)*
- Connects to Google, Microsoft, Slack
- OAuth flows with secure token handling
- Syncs external contact data into the unified model

### Experiments
- A/B testing system for validating hypotheses
- Variants for deck size, paywall copy, Fresh window length, and draft count

---

## 🛠️ Tech Stack
- **React Native + Expo** — mobile framework
- **Expo Router** — file-based navigation
- **Zustand + React Query** — state management and data fetching
- **Supabase** — backend database and edge functions
- **RevenueCat** — subscription management
- **Expo AuthSession** — OAuth flows (Google/Microsoft/Slack)
- **Expo Notifications + Background Fetch** — reminders and background tasks
- **SQLite (expo-sqlite)** — local persistence

---

## 🎯 Design Principles
- **Finishable, not infinite**: Small daily decks create sustainable habits.
- **Manual over magic**: AI suggests, but users stay in control.
- **Context receipts**: Notes and outcomes provide memory.
- **Privacy-first**: Export/delete available, no auto-sending.
- **Calm UX**: Nudges support consistency without anxiety.

---

## 🚀 Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/rollcall-rn.git
   cd rollcall-rn
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start Expo App
   ```bash
   npx expo start
   ```

4. Run on iOS or Android simulator, or scan the QR code with Expo Go

---

