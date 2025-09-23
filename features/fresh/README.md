# Fresh Feature

The Fresh feature calculates and displays new connections and recency scoring.

## Explanation
Fresh identifies newly ingested contacts and gives them a visible priority.  
Contacts marked as Fresh get a "NEW" pill in the deck and a temporary score boost to ensure quick engagement.  
The feature also manages the RHS (Relationship Health Score), which decays over time and is recalculated after each interaction.

## What it does
- Marks new contacts as Fresh (first 14 days or until first touch)
- Displays a "NEW" pill on Fresh contacts
- Calculates and updates RHS using recency, cadence fit, tag priority, and fatigue guard
- Provides hooks to fetch and score contacts