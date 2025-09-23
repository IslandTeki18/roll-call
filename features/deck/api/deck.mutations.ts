// deck.mutations.ts
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { Outcome, Contact, Note, DeckCard, Channel } from "./deck.types";
import { deckKeys, contactKeys } from "./deck.queries";

export interface DeckMutations {
  useCompleteCard: () => UseMutationResult<void, Error, Outcome>;
  useCreateNote: () => UseMutationResult<Note, Error, CreateNoteParams>;
  useUpdateContact: () => UseMutationResult<
    Contact,
    Error,
    Partial<Contact> & { id: string }
  >;
  useSendMessage: () => UseMutationResult<void, Error, SendMessageParams>;
}

interface CreateNoteParams {
  content: string;
  contactIds: string[];
  tags?: string[];
  isPinned?: boolean;
}

interface SendMessageParams {
  card: DeckCard;
  channel: Channel;
  message: string;
  outcome: Outcome;
}

/**
 * Mutation to complete a deck card
 */
export const useCompleteCard = (): UseMutationResult<void, Error, Outcome> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outcome: Outcome): Promise<void> => {
      // In a real app, this would update the backend
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update local storage or backend with the outcome
      console.log("Card completed:", outcome);
    },
    onSuccess: (_, outcome) => {
      // Update the deck in the query cache
      const today = new Date().toISOString().split("T")[0];

      queryClient.setQueryData(deckKeys.date(today), (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          completedCards: [...oldData.completedCards, outcome.cardId],
          isComplete:
            oldData.completedCards.length + 1 === oldData.cards.length,
        };
      });

      // If the action was 'sent', update the contact's last interaction
      if (outcome.action === "sent") {
        queryClient.setQueryData(
          contactKeys.all,
          (oldContacts: Contact[] | undefined) => {
            if (!oldContacts) return oldContacts;

            return oldContacts.map((contact) =>
              contact.id === outcome.contactId
                ? { ...contact, lastInteraction: outcome.sentAt || new Date() }
                : contact
            );
          }
        );
      }
    },
    onError: (error) => {
      console.error("Failed to complete card:", error);
    },
  });
};

/**
 * Mutation to create a new note
 */
export const useCreateNote = (): UseMutationResult<
  Note,
  Error,
  CreateNoteParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateNoteParams): Promise<Note> => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      const note: Note = {
        id: `note-${Date.now()}`,
        content: params.content,
        contactIds: params.contactIds,
        tags: params.tags || [],
        isPinned: params.isPinned || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In a real app, would send to backend and get AI processing
      console.log("Note created:", note);

      return note;
    },
    onSuccess: (newNote) => {
      // Invalidate related queries to refetch with new note
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      // Update contacts to reflect they have a new note
      queryClient.setQueryData(
        contactKeys.all,
        (oldContacts: Contact[] | undefined) => {
          if (!oldContacts) return oldContacts;

          return oldContacts.map((contact) => {
            if (newNote.contactIds.includes(contact.id)) {
              // In a real app, you'd add note reference to contact
              return { ...contact };
            }
            return contact;
          });
        }
      );
    },
  });
};

/**
 * Mutation to update a contact
 */
export const useUpdateContact = (): UseMutationResult<
  Contact,
  Error,
  Partial<Contact> & { id: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Partial<Contact> & { id: string }
    ): Promise<Contact> => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 400));

      console.log("Contact updated:", updates);

      // In a real app, this would update the backend
      return updates as Contact;
    },
    onSuccess: (updatedContact) => {
      // Update the contact in the cache
      queryClient.setQueryData(
        contactKeys.all,
        (oldContacts: Contact[] | undefined) => {
          if (!oldContacts) return oldContacts;

          return oldContacts.map((contact) =>
            contact.id === updatedContact.id
              ? { ...contact, ...updatedContact }
              : contact
          );
        }
      );

      // Invalidate today's deck since contact changes might affect card order
      const today = new Date().toISOString().split("T")[0];
      queryClient.invalidateQueries({ queryKey: deckKeys.date(today) });
    },
  });
};

/**
 * Mutation to send a message through various channels
 */
export const useSendMessage = (): UseMutationResult<
  void,
  Error,
  SendMessageParams
> => {
  const completeCardMutation = useCompleteCard();

  return useMutation({
    mutationFn: async (params: SendMessageParams): Promise<void> => {
      const { card, channel, message, outcome } = params;

      // Simulate sending based on channel type
      await sendViaChannel(channel, message, card.contact);

      console.log(`Message sent via ${channel.type}:`, message);
    },
    onSuccess: (_, params) => {
      // Complete the card after successful send
      completeCardMutation.mutate(params.outcome);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });
};

/**
 * Mutation to skip a card
 */
export const useSkipCard = (): UseMutationResult<
  void,
  Error,
  { cardId: string; reason?: string }
> => {
  const completeCardMutation = useCompleteCard();

  return useMutation({
    mutationFn: async (params: {
      cardId: string;
      reason?: string;
    }): Promise<void> => {
      // Log skip reason for analytics
      console.log("Card skipped:", params);

      // Simulate brief delay
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    onSuccess: (_, params) => {
      // Complete the card as skipped
      const outcome: Outcome = {
        cardId: params.cardId,
        contactId: "", // Would be filled from card data
        action: "skipped",
      };

      completeCardMutation.mutate(outcome);
    },
  });
};

/**
 * Mutation to refresh today's deck (regenerate cards)
 */
export const useRefreshDeck = (): UseMutationResult<void, Error, void> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      // Simulate refresh delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log("Deck refreshed");
    },
    onSuccess: () => {
      // Invalidate today's deck to trigger refetch
      const today = new Date().toISOString().split("T")[0];
      queryClient.invalidateQueries({ queryKey: deckKeys.date(today) });
    },
  });
};

/**
 * Mutation to mark a contact as Fresh (for testing)
 */
export const useMarkContactFresh = (): UseMutationResult<
  void,
  Error,
  string
> => {
  const updateContactMutation = useUpdateContact();

  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      // Mark contact as fresh by updating firstSeen and removing lastInteraction
      const updates = {
        id: contactId,
        firstSeen: new Date(),
        lastInteraction: undefined,
      };

      return updateContactMutation.mutateAsync(updates);
    },
  });
};

// Helper function to send messages via different channels
async function sendViaChannel(
  channel: Channel,
  message: string,
  contact: Contact
): Promise<void> {
  switch (channel.type) {
    case "sms":
      // In React Native, would use react-native-message-compose
      console.log(`SMS to ${channel.value}: ${message}`);
      break;

    case "call":
      // In React Native, would use Linking.openURL('tel:...')
      console.log(`Calling ${channel.value}`);
      break;

    case "facetime":
      // In React Native, would use Linking.openURL('facetime:...')
      console.log(`FaceTime to ${channel.value}`);
      break;

    case "email":
      if (channel.isPremium) {
        // Premium: Send via API (Gmail/Outlook)
        console.log(`Email sent via API to ${channel.value}: ${message}`);
      } else {
        // Free: Open compose
        console.log(`Email compose opened for ${channel.value}`);
      }
      break;

    case "slack":
      // Premium: Send via Slack API
      console.log(`Slack message sent to ${contact.displayName}: ${message}`);
      break;

    case "whatsapp":
    case "telegram":
    case "linkedin":
      // Premium: Open deep link
      console.log(`${channel.type} deeplink opened for ${contact.displayName}`);
      break;

    default:
      throw new Error(`Unsupported channel type: ${channel.type}`);
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Mutation to import contacts from external sources
 */
export const useImportContacts = (): UseMutationResult<
  Contact[],
  Error,
  "google" | "outlook" | "slack"
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      source: "google" | "outlook" | "slack"
    ): Promise<Contact[]> => {
      // Simulate OAuth flow and contact import
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`Importing contacts from ${source}`);

      // Return demo imported contacts
      return [
        CardBuilders.createDemoContact({
          id: `imported-${source}-1`,
          firstName: "Imported",
          lastName: "Contact",
          displayName: "Imported Contact",
          source,
          firstSeen: new Date(), // Fresh connection
        }),
      ];
    },
    onSuccess: (importedContacts) => {
      // Add imported contacts to the existing list
      queryClient.setQueryData(
        contactKeys.all,
        (oldContacts: Contact[] | undefined) => {
          const existing = oldContacts || [];
          return [...existing, ...importedContacts];
        }
      );

      // Invalidate fresh connections query
      queryClient.invalidateQueries({ queryKey: contactKeys.fresh() });

      // Invalidate today's deck to include new contacts
      const today = new Date().toISOString().split("T")[0];
      queryClient.invalidateQueries({ queryKey: deckKeys.date(today) });
    },
  });
};
