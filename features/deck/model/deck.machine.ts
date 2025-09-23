import { createMachine, assign } from "xstate";
import {
  DeckMachineContext,
  DeckAction,
  DeckState,
  UserPreferences,
} from "./deck.types";

export const deckMachine = createMachine<DeckMachineContext, DeckAction>(
  {
    id: "deckMachine",
    initial: "idle",
    context: {
      deckState: {
        date: new Date().toISOString().split("T")[0],
        cards: [],
        completedCards: [],
        currentCardIndex: 0,
        isComplete: false,
        maxCards: 5,
      },
      userPreferences: {
        isPremium: false,
        quietHours: { start: "22:00", end: "08:00" },
        dailyNudgeEnabled: true,
        deckSize: 5,
      },
      isLoading: false,
    },
    states: {
      idle: {
        on: {
          LOAD_DECK: {
            target: "loading",
            actions: assign({
              isLoading: true,
              error: undefined,
            }),
          },
        },
      },
      loading: {
        invoke: {
          src: "loadDeck",
          onDone: {
            target: "ready",
            actions: assign({
              deckState: (_, event) => event.data,
              isLoading: false,
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: (_, event) => event.data.message,
              isLoading: false,
            }),
          },
        },
      },
      ready: {
        always: [
          {
            target: "complete",
            cond: "isDeckComplete",
          },
        ],
        on: {
          NEXT_CARD: {
            actions: assign({
              deckState: (context) => ({
                ...context.deckState,
                currentCardIndex: Math.min(
                  context.deckState.currentCardIndex + 1,
                  context.deckState.cards.length - 1
                ),
              }),
            }),
          },
          PREVIOUS_CARD: {
            actions: assign({
              deckState: (context) => ({
                ...context.deckState,
                currentCardIndex: Math.max(
                  context.deckState.currentCardIndex - 1,
                  0
                ),
              }),
            }),
          },
          COMPLETE_CARD: {
            actions: assign({
              deckState: (context, event) => {
                const completedCards = [
                  ...context.deckState.completedCards,
                  event.payload.cardId,
                ];
                return {
                  ...context.deckState,
                  completedCards,
                  isComplete:
                    completedCards.length === context.deckState.cards.length,
                };
              },
            }),
          },
          SKIP_CARD: {
            actions: assign({
              deckState: (context, event) => {
                const completedCards = [
                  ...context.deckState.completedCards,
                  event.payload.cardId,
                ];
                return {
                  ...context.deckState,
                  completedCards,
                  isComplete:
                    completedCards.length === context.deckState.cards.length,
                };
              },
            }),
          },
          SET_CURRENT_CARD: {
            actions: assign({
              deckState: (context, event) => ({
                ...context.deckState,
                currentCardIndex: event.payload.index,
              }),
            }),
          },
          RESET_DECK: {
            target: "idle",
            actions: assign({
              deckState: (context) => ({
                ...context.deckState,
                completedCards: [],
                currentCardIndex: 0,
                isComplete: false,
              }),
            }),
          },
        },
      },
      complete: {
        on: {
          LOAD_DECK: {
            target: "loading",
            actions: assign({
              isLoading: true,
              error: undefined,
            }),
          },
          RESET_DECK: {
            target: "idle",
          },
        },
      },
      error: {
        on: {
          LOAD_DECK: {
            target: "loading",
            actions: assign({
              isLoading: true,
              error: undefined,
            }),
          },
        },
      },
    },
  },
  {
    guards: {
      isDeckComplete: (context) => context.deckState.isComplete,
    },
    services: {
      loadDeck: async (context, event) => {
        // This would be implemented to load deck data
        // For now, return a mock deck state
        return {
          ...context.deckState,
          date:
            event.type === "LOAD_DECK"
              ? event.payload.date
              : context.deckState.date,
          // Would populate cards based on RHS algorithm
          cards: [],
        };
      },
    },
  }
);
