import { useRouter } from "expo-router";
import type { ChannelType } from "../types/communication.types";

export const useCommunications = () => {
  const router = useRouter();

  /**
   * Start communication flow for a contact
   * Navigates to channel-picker screen
   */
  const startCommunication = (contactId: string) => {
    router.push({
      pathname: "/(communications)/channel-picker",
      params: { contactId },
    });
  };

  /**
   * Navigate to compose screen with selected channel
   */
  const navigateToCompose = (
    contactId: string,
    channel: ChannelType,
    draftId?: string
  ) => {
    router.push({
      pathname: "/(communications)/compose",
      params: {
        contactId,
        channel,
        ...(draftId && { draftId }),
      },
    });
  };

  /**
   * Navigate to outcome sheet (future)
   */
  const navigateToOutcome = (
    contactId: string,
    channel: ChannelType,
    draftId?: string
  ) => {
    router.push({
      pathname: "/(communications)/outcome",
      params: {
        contactId,
        channel,
        ...(draftId && { draftId }),
      },
    });
  };

  /**
   * Go back to previous screen
   */
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  /**
   * Dismiss modal/sheet (if presented modally)
   */
  const dismiss = () => {
    router.dismiss();
  };

  return {
    startCommunication,
    navigateToCompose,
    navigateToOutcome,
    goBack,
    dismiss,
  };
};
