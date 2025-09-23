# Messaging Feature

The Messaging feature manages drafts, channels, and sending actions.

## Explanation
Messaging connects the Deck to real-world communication.  
Each card offers draft options, which can be sent through different channels like SMS, calls, email, or Slack.  
Free users use native bridges (SMS/Call), while premium users get direct email and Slack sends via the backend.  
Every send produces an outcome receipt that updates recency scoring.

## What it does
- Provides draft templates for quick replies
- Allows one-tap sending across multiple channels
- Integrates with native SMS/Call and premium email/Slack APIs
- Handles send outcomes and updates contact scores
- Provides hooks for draft selection and sending
