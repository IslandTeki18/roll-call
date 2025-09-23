# Contacts Feature

The Contacts feature manages all people data in the app.

## Explanation
Contacts are the foundation for every other feature. The system ingests people from the device (free) and external sources like Google, Microsoft, or Slack (premium).  
All contacts are normalized into a single, unified type. Duplicate entries are merged, and each contact can be enriched with notes, deck cards, and recency scoring.  
This ensures the user always interacts with a clean, consistent contact list across features.

## What it does
- Import contacts from the device (free)
- Connect and sync contacts from Google, Microsoft, and Slack (premium)
- Normalize different data sources into one unified contact type
- Deduplicate and merge overlapping entries
- Provide picker and detail views for user interaction
- Integrate with deck cards and notes for a full relationship history
