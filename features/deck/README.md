# Deck Feature

The Deck feature handles the daily card workflow.

## Explanation
The Deck is the core loop of the app. Each day, the user gets a small, finishable set of cards (5 for free users, 10 for premium).  
Each card represents a contact the user should reach out to. The flow is simple:
1. Open a card  
2. Pick one of the suggested drafts  
3. Send it via the chosen channel (SMS, call, email, etc.)  
4. Record the outcome on the Outcome Sheet  

This creates a lightweight daily habit that keeps relationships warm without overwhelming the user.

## What it does
- Shows a fixed number of cards (5 free, 10 premium)
- Lets the user pick a draft message for each contact
- Sends the message through the chosen channel
- Records the outcome and updates recency/score
