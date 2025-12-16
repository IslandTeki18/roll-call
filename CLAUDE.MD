# RollCall — Project Context for Claude

## Project Overview
RollCall is a React Native mobile application built with Expo that helps users maintain their relationships in just 60 seconds a day. The app presents a daily deck of cards representing people to reach out to, with quick draft messages and one-tap send actions.

## Architecture

### Tech Stack
- **React Native + Expo** (v54) — Cross-platform mobile framework
- **Expo Router** (v6) — File-based navigation system
- **TypeScript** (v5.9) — Type safety
- **NativeWind** (v4.2) + **Tailwind CSS** (v3.4) — Styling
- **Clerk** (v2.19) — Authentication and user management
- **RevenueCat** (v9.6) — Subscription and paywall management
- **Appwrite** — Backend database and storage
- **Expo Contacts** — Native contact access
- **React Native Reanimated** (v4.1) — Animations

### Project Structure
```
/app                    # Expo Router file-based routing
  /(auth)              # Authentication screens (sign-in, sign-up)
  /(tabs)              # Main tab navigation
    /contacts          # Contact list and details
    /deck              # Daily deck feature
    /notes             # Notes feature
    /settings          # Settings screen
  /reports             # Reports screen (premium)
  /_layout.tsx         # Root layout with providers
  /index.tsx           # Entry point

/features              # Feature-based modules
  /auth                # Authentication logic, hooks, services
  /contacts            # Contact management
  /outcomes            # Outcome tracking
  /shared              # Shared utilities and configurations

/assets                # Static assets (fonts, images)
/functions             # Cloud functions
/docs                  # Documentation
/scripts               # Build and utility scripts
```

### Key Features

#### Core Features (Free)
1. **Daily Deck** — 5 cards per day representing people to contact
2. **Contacts** — Device contact integration with deduplication
3. **Notes** — Manual note-taking with AI assistance
4. **Messaging** — One-tap SMS, call, FaceTime, email
5. **Fresh** — NEW pill for recently added contacts
6. **Search** — Global search across contacts and notes

#### Premium Features
1. **Extended Deck** — 10 cards per day
2. **Reports** — Analytics, heatmaps, cooling lists
3. **Occasions** — Birthday and milestone reminders
4. **Sources** — Google, Microsoft, Slack integrations via OAuth
5. **Advanced Messaging** — Email and Slack send capabilities

### Design Patterns

#### Feature-Based Architecture
Each feature is isolated in its own directory with:
- `screens/` — Full screen components
- `components/` — Reusable UI components
- `hooks/` — Custom React hooks
- `api/` — Service layer for data fetching
- `types/` — TypeScript type definitions
- `lib/` — Utility functions and configurations

#### State Management
- **Clerk** — User authentication and profile state
- **Local state** — React hooks for component state
- **Premium state** — RevenueCat for subscription status

### Key Concepts

#### RHS (Relationship Health Score)
A scoring system that calculates relationship health based on:
- Engagement frequency and recency
- Cadence settings (how often to reach out)
- Decay over time
- Fresh contact handling

#### Engagement Tracking
Records every interaction (message, call, email, note) with metadata:
- Timestamp
- Engagement type
- Outcome
- Associated notes

#### Cadence System
Users can set custom cadences for contacts:
- Daily, Weekly, Biweekly, Monthly, Quarterly, Annually
- Custom intervals
- Used for RHS calculation and deck prioritization

### Authentication & Authorization
- **Clerk** manages user authentication
- OAuth flows via `expo-auth-session` for external sources
- Token caching with `@clerk/clerk-expo/token-cache`
- Premium status checked via RevenueCat

### Data Layer
- **Local Storage**: expo-sqlite for offline-first contact data
- **Remote Storage**: Appwrite for user profiles, notes, and sync
- **Contact Sync**: Expo Contacts API for device contact access

### Navigation Structure
```
Root
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

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint configuration via `eslint-config-expo`
- Functional components with hooks
- NativeWind classes for styling

### Component Patterns
- Screen components in `features/[feature]/screens/`
- Reusable components in `features/[feature]/components/`
- Shared components in `features/shared/components/`
- Use TypeScript interfaces for props

### State Patterns
- Use hooks for local state
- Custom hooks in feature directories
- Service layer for API calls
- Premium gating via `usePremiumGate` hook

### Styling
- NativeWind utility classes preferred
- Tailwind config in `tailwind.config.js`
- Global styles in `global.css`
- Responsive design for different screen sizes

## Environment Variables
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk authentication

## Common Commands
```bash
npm start              # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript compiler check
npm test               # Run Jest tests
```

## Design Principles
1. **Finishable, not infinite** — Small daily decks create sustainable habits
2. **Manual over magic** — AI suggests, but users stay in control
3. **Context receipts** — Notes and outcomes provide memory
4. **Privacy-first** — Export/delete available, no auto-sending
5. **Calm UX** — Nudges support consistency without anxiety

## Key Files to Reference
- `/app/_layout.tsx` — Root layout with Clerk and GestureHandler providers
- `/features/auth/hooks/usePremiumGate.ts` — Premium feature gating
- `/features/auth/hooks/useUserProfile.ts` — User profile management
- `/features/contacts/api/contacts.service.ts` — Contact data layer
- `/features/contacts/components/ContactCard.tsx` — Main contact display component

## Recent Work
Based on recent commits:
- User profile handling refactored
- ContactCard layout improvements
- RHS debug feature added to ContactDetailsScreen
- RHS calculations and analytics enhanced
- Engagement metadata tracking implemented
- NEW pill added for fresh contacts
- tablesDB integration for contacts and engagement
- Contact search functionality added

## Testing
- Jest configured via `jest-expo`
- Test files should be co-located with features
- Run tests with `npm test`

## Notes for AI Assistants
- Always check premium status before accessing premium features
- Use the service layer (`*.service.ts`) for data operations
- Follow the feature-based architecture when adding new functionality
- Maintain TypeScript type safety
- Respect the privacy-first design principle
- Keep the UI calm and focused on the core habit loop
