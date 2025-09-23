# Experiments Feature

The Experiments feature manages A/B testing and feature flagging.

## Explanation
Experiments allow the team to test hypotheses from the PRD, such as deck size (5 vs 7), paywall copy, and Fresh windows.  
Each user is bucketed into a variant, and the assignment is sticky to ensure consistent results.  
Metrics are tracked through React Query and stored in the backend for analysis.

## What it does
- Assigns users to experimental variants
- Exposes current variant values to the app
- Supports toggling experiments on/off remotely
- Runs A/B tests on deck size, paywall headlines, Fresh window length, and draft counts
