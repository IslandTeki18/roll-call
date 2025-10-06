/**
 * Communications Feature Types
 *
 * Defines all types for the Communications feature (Freemium tier).
 * Covers channel selection, message composition, and send flows.
 */

// ============================================================================
// Core Channel Types
// ============================================================================

/**
 * Available communication channels in Freemium tier
 */
export type ChannelType = "sms" | "call" | "facetime";

/**
 * Channel availability status
 */
export type ChannelStatus =
  | "available" // Channel is ready to use
  | "unavailable" // Not supported on this device/platform
  | "permission_needed" // Requires user permission
  | "disabled"; // Temporarily disabled

/**
 * Channel metadata for UI display
 */
export interface Channel {
  type: ChannelType;
  label: string;
  icon: string; // Icon name (lucide-react-native or custom)
  status: ChannelStatus;
  permissionMessage?: string; // Message to show if permission needed
  platform?: "ios" | "android" | "both"; // Platform availability
}

// ============================================================================
// Draft & Message Types
// ============================================================================

/**
 * Draft message structure (from AI or templates)
 */
export interface Draft {
  id: string;
  text: string;
  characterCount: number;
  source: "ai" | "template" | "user";
  context?: string; // Why this draft was suggested (e.g., "intro source", "last touch")
}

/**
 * Message to be sent
 */
export interface Message {
  contactId: string;
  contactName: string;
  contactPhone?: string;
  channel: ChannelType;
  draft?: Draft; // Only for SMS/text channels
  timestamp: number;
}

// ============================================================================
// Contact Information Types
// ============================================================================

/**
 * Minimal contact info needed for communications
 */
export interface ContactCommInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string; // Reserved for Premium
  avatar?: string;
  isFresh?: boolean; // If this is a Fresh Connection
}

// ============================================================================
// Channel Picker Screen Types
// ============================================================================

/**
 * Props for ChannelPickerScreen
 */
export interface ChannelPickerScreenProps {
  contactId: string;
  onChannelSelect: (channel: ChannelType) => void;
  onBack?: () => void;
}

/**
 * State for channel picker
 */
export interface ChannelPickerState {
  availableChannels: Channel[];
  selectedChannel: ChannelType | null;
  isLoading: boolean;
}

// ============================================================================
// Compose Screen Types
// ============================================================================

/**
 * Props for ComposeScreen
 */
export interface ComposeScreenProps {
  contactId: string;
  channel: ChannelType;
  draft?: Draft;
  onSend: (message: Message) => void;
  onBack?: () => void;
}

/**
 * State for compose screen
 */
export interface ComposeState {
  contact: ContactCommInfo | null;
  selectedDraft: Draft | null;
  isReady: boolean;
  isSending: boolean;
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for ChannelButton component
 */
export interface ChannelButtonProps {
  channel: Channel;
  onPress: () => void;
  isSelected?: boolean;
  disabled?: boolean;
}

/**
 * Props for ChannelList component
 */
export interface ChannelListProps {
  channels: Channel[];
  onChannelSelect: (channel: ChannelType) => void;
  selectedChannel?: ChannelType;
  layout?: "row" | "grid";
}

/**
 * Props for ComposePreview component
 */
export interface ComposePreviewProps {
  draft: Draft;
  contact: ContactCommInfo;
  channel: ChannelType;
  onEdit?: () => void; // Reserved for future
}

/**
 * Props for PermissionNotice component
 */
export interface PermissionNoticeProps {
  channel: Channel;
  onRequestPermission?: () => void;
  onDismiss?: () => void;
}

// ============================================================================
// Send Result Types
// ============================================================================

/**
 * Result of a send attempt
 */
export interface SendResult {
  success: boolean;
  channel: ChannelType;
  contactId: string;
  timestamp: number;
  error?: SendError;
}

/**
 * Error types for send failures
 */
export type SendErrorType =
  | "permission_denied"
  | "no_phone_number"
  | "network_error"
  | "user_cancelled"
  | "platform_error"
  | "unknown";

/**
 * Send error details
 */
export interface SendError {
  type: SendErrorType;
  message: string;
  recoverable: boolean; // Can user retry?
}

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Communications stack navigation params
 */
export type CommunicationsStackParamList = {
  ChannelPicker: {
    contactId: string;
  };
  Compose: {
    contactId: string;
    channel: ChannelType;
    draftId?: string;
  };
};

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission states for different channels
 */
export interface ChannelPermissions {
  contacts: boolean;
  sms: boolean;
  phone: boolean;
  facetime: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  canAskAgain: boolean;
  platform: "ios" | "android";
}
