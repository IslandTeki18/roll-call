/**
 * Communications Feature Mock Data
 *
 * Provides mock channels, drafts, and contacts for UI development.
 */

import { Platform } from "react-native";
import type {
  Channel,
  Draft,
  ContactCommInfo,
  Message,
  SendResult,
  ChannelPermissions,
} from "../types/communication.types";

// ============================================================================
// Mock Channels
// ============================================================================

/**
 * Mock channel list for iOS
 */
export const MOCK_CHANNELS_IOS: Channel[] = [
  {
    type: "sms",
    label: "Message",
    icon: "message-circle",
    status: "available",
    platform: "both",
  },
  {
    type: "call",
    label: "Call",
    icon: "phone",
    status: "available",
    platform: "both",
  },
  {
    type: "facetime",
    label: "FaceTime",
    icon: "video",
    status: "available",
    platform: "ios",
  },
];

/**
 * Mock channel list for Android (no FaceTime)
 */
export const MOCK_CHANNELS_ANDROID: Channel[] = [
  {
    type: "sms",
    label: "Message",
    icon: "message-circle",
    status: "available",
    platform: "both",
  },
  {
    type: "call",
    label: "Call",
    icon: "phone",
    status: "available",
    platform: "both",
  },
  {
    type: "facetime",
    label: "FaceTime",
    icon: "video",
    status: "unavailable",
    platform: "ios",
    permissionMessage: "FaceTime is only available on iOS devices",
  },
];

/**
 * Get platform-appropriate mock channels
 */
export const getMockChannels = (): Channel[] => {
  return Platform.OS === "ios" ? MOCK_CHANNELS_IOS : MOCK_CHANNELS_ANDROID;
};

/**
 * Mock channels with permission issues
 */
export const MOCK_CHANNELS_WITH_PERMISSIONS: Channel[] = [
  {
    type: "sms",
    label: "Message",
    icon: "message-circle",
    status: "permission_needed",
    platform: "both",
    permissionMessage: "RollCall needs permission to compose messages",
  },
  {
    type: "call",
    label: "Call",
    icon: "phone",
    status: "available",
    platform: "both",
  },
  {
    type: "facetime",
    label: "FaceTime",
    icon: "video",
    status: "available",
    platform: "ios",
  },
];

// ============================================================================
// Mock Contacts
// ============================================================================

export const MOCK_CONTACTS: ContactCommInfo[] = [
  {
    id: "contact-1",
    name: "Sarah Chen",
    phone: "+1 415 555 0123",
    avatar: "https://i.pravatar.cc/150?img=1",
    isFresh: true,
  },
  {
    id: "contact-2",
    name: "Marcus Johnson",
    phone: "+1 415 555 0456",
    avatar: "https://i.pravatar.cc/150?img=12",
    isFresh: false,
  },
  {
    id: "contact-3",
    name: "Priya Patel",
    phone: "+1 415 555 0789",
    avatar: "https://i.pravatar.cc/150?img=5",
    isFresh: true,
  },
  {
    id: "contact-4",
    name: "Alex Rivera",
    phone: "+1 415 555 0321",
    avatar: "https://i.pravatar.cc/150?img=8",
    isFresh: false,
  },
  {
    id: "contact-5",
    name: "Jamie Taylor",
    phone: "+1 415 555 0654",
    avatar: "https://i.pravatar.cc/150?img=9",
    isFresh: false,
  },
];

// ============================================================================
// Mock Drafts
// ============================================================================

/**
 * AI-generated draft examples
 */
export const MOCK_AI_DRAFTS: Draft[] = [
  {
    id: "draft-ai-1",
    text: "Hey Sarah! Congrats on the Series A. Would love to catch up on how things are going. Coffee next week?",
    characterCount: 106,
    source: "ai",
    context: "Last touch: 3 weeks ago • Intro source: TechCrunch event",
  },
  {
    id: "draft-ai-2",
    text: "Sarah - thinking of you! How's the team building going? Happy to intro you to some great folks if helpful.",
    characterCount: 108,
    source: "ai",
    context: "Last touch: 3 weeks ago • Intro source: TechCrunch event",
  },
  {
    id: "draft-ai-3",
    text: "Marcus! Hope you're crushing it. Saw your post on the product launch - really impressive stuff. Let's sync soon?",
    characterCount: 116,
    source: "ai",
    context: "Last touch: 6 days ago • Tag: Founder",
  },
  {
    id: "draft-ai-4",
    text: "Hey Marcus, been a minute! Would love to hear how Q4 is shaping up. Grab lunch?",
    characterCount: 82,
    source: "ai",
    context: "Last touch: 6 days ago • Tag: Founder",
  },
  {
    id: "draft-ai-5",
    text: "Priya - congrats on the keynote! I'd love to learn more about your AI work. Coffee or call?",
    characterCount: 94,
    source: "ai",
    context: "Fresh Connection • Added: 5 days ago",
  },
  {
    id: "draft-ai-6",
    text: "Hey Priya! Really enjoyed your talk at the conference. Would love to stay in touch!",
    characterCount: 84,
    source: "ai",
    context: "Fresh Connection • Added: 5 days ago",
  },
];

/**
 * Template-based draft examples
 */
export const MOCK_TEMPLATE_DRAFTS: Draft[] = [
  {
    id: "draft-template-1",
    text: "Hey! Just checking in. How have you been?",
    characterCount: 43,
    source: "template",
    context: "Check-in template",
  },
  {
    id: "draft-template-2",
    text: "Hope you're doing well! Let's catch up soon.",
    characterCount: 47,
    source: "template",
    context: "Catch-up template",
  },
  {
    id: "draft-template-3",
    text: "Thinking of you! Would love to reconnect.",
    characterCount: 43,
    source: "template",
    context: "Reconnect template",
  },
];

/**
 * Get drafts for a specific contact
 */
export const getDraftsForContact = (contactId: string): Draft[] => {
  const draftMap: Record<string, Draft[]> = {
    "contact-1": [MOCK_AI_DRAFTS[0], MOCK_AI_DRAFTS[1]],
    "contact-2": [MOCK_AI_DRAFTS[2], MOCK_AI_DRAFTS[3]],
    "contact-3": [MOCK_AI_DRAFTS[4], MOCK_AI_DRAFTS[5]],
    "contact-4": [MOCK_TEMPLATE_DRAFTS[0], MOCK_TEMPLATE_DRAFTS[1]],
    "contact-5": [MOCK_TEMPLATE_DRAFTS[2], MOCK_TEMPLATE_DRAFTS[0]],
  };

  return (
    draftMap[contactId] || [MOCK_TEMPLATE_DRAFTS[0], MOCK_TEMPLATE_DRAFTS[1]]
  );
};

/**
 * Get contact by ID
 */
export const getContactById = (
  contactId: string
): ContactCommInfo | undefined => {
  return MOCK_CONTACTS.find((c) => c.id === contactId);
};

// ============================================================================
// Mock Messages
// ============================================================================

export const MOCK_MESSAGES: Message[] = [
  {
    contactId: "contact-1",
    contactName: "Sarah Chen",
    contactPhone: "+1 415 555 0123",
    channel: "sms",
    draft: MOCK_AI_DRAFTS[0],
    timestamp: Date.now(),
  },
  {
    contactId: "contact-2",
    contactName: "Marcus Johnson",
    contactPhone: "+1 415 555 0456",
    channel: "call",
    timestamp: Date.now() - 3600000,
  },
];

// ============================================================================
// Mock Send Results
// ============================================================================

export const MOCK_SEND_SUCCESS: SendResult = {
  success: true,
  channel: "sms",
  contactId: "contact-1",
  timestamp: Date.now(),
};

export const MOCK_SEND_ERROR_PERMISSION: SendResult = {
  success: false,
  channel: "sms",
  contactId: "contact-1",
  timestamp: Date.now(),
  error: {
    type: "permission_denied",
    message: "RollCall needs permission to send messages",
    recoverable: true,
  },
};

export const MOCK_SEND_ERROR_NO_PHONE: SendResult = {
  success: false,
  channel: "call",
  contactId: "contact-3",
  timestamp: Date.now(),
  error: {
    type: "no_phone_number",
    message: "This contact has no phone number",
    recoverable: false,
  },
};

export const MOCK_SEND_ERROR_CANCELLED: SendResult = {
  success: false,
  channel: "sms",
  contactId: "contact-2",
  timestamp: Date.now(),
  error: {
    type: "user_cancelled",
    message: "Message composition was cancelled",
    recoverable: true,
  },
};

// ============================================================================
// Mock Permissions
// ============================================================================

export const MOCK_PERMISSIONS_ALL_GRANTED: ChannelPermissions = {
  contacts: true,
  sms: true,
  phone: true,
  facetime: true,
};

export const MOCK_PERMISSIONS_PARTIAL: ChannelPermissions = {
  contacts: true,
  sms: false,
  phone: true,
  facetime: true,
};

export const MOCK_PERMISSIONS_NONE: ChannelPermissions = {
  contacts: false,
  sms: false,
  phone: false,
  facetime: false,
};

// ============================================================================
// Utility Functions for Mock Data
// ============================================================================

/**
 * Simulate async channel loading
 */
export const loadChannelsAsync = async (delay = 500): Promise<Channel[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockChannels());
    }, delay);
  });
};

/**
 * Simulate async draft loading
 */
export const loadDraftsAsync = async (
  contactId: string,
  delay = 800
): Promise<Draft[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getDraftsForContact(contactId));
    }, delay);
  });
};

/**
 * Simulate sending a message
 */
export const sendMessageAsync = async (
  message: Message,
  delay = 1000
): Promise<SendResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate 90% success rate
      const success = Math.random() > 0.1;

      if (success) {
        resolve({
          success: true,
          channel: message.channel,
          contactId: message.contactId,
          timestamp: Date.now(),
        });
      } else {
        resolve(MOCK_SEND_ERROR_CANCELLED);
      }
    }, delay);
  });
};

/**
 * Generate random fresh connection flag
 */
export const generateRandomContacts = (count: number): ContactCommInfo[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `contact-${i + 100}`,
    name: `Contact ${i + 1}`,
    phone: `+1 415 555 ${String(i).padStart(4, "0")}`,
    avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
    isFresh: Math.random() > 0.7,
  }));
};
