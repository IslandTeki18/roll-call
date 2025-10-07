/**
 * Core Note entity
 */
export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  tags: string[];
  contactIds: string[];
  aiSummary?: string;
  aiEntities?: ExtractedEntity[];
  aiNextCTA?: SuggestedNextAction;
  source: NoteSource;
  sourceId?: string;
  isVoiceNote?: boolean;
  voiceDuration?: number; // seconds
}

/**
 * How the note was created
 */
export enum NoteSource {
  MANUAL = "manual", // User created from scratch
  AUTO_OUTCOME = "auto_outcome", // Auto-created after deck outcome
  VOICE = "voice", // Voice-to-text input
  IMPORT = "import", // Future: external import
}

/**
 * AI-extracted entities from note content
 */
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence?: number; // 0-1 score
}

export enum EntityType {
  PERSON = "person",
  ORGANIZATION = "organization",
  DATE = "date",
  LOCATION = "location",
  PROJECT = "project",
  TOPIC = "topic",
}

/**
 * AI-suggested next action
 */
export interface SuggestedNextAction {
  action: string; // e.g., "Follow up about Q4 goals"
  suggestedDate?: Date; // When to do it
  confidence?: number; // 0-1 score
  channel?: string; // e.g., "email", "call"
}

/**
 * Note creation input (what user provides)
 */
export interface CreateNoteInput {
  content: string;
  contactIds: string[]; // Must have at least one
  tags?: string[];
  isPinned?: boolean;
  source?: NoteSource;
  sourceId?: string;
}

/**
 * Note update input (partial updates)
 */
export interface UpdateNoteInput {
  id: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  contactIds?: string[]; // Can re-associate to different contacts
}

/**
 * Note filters for queries
 */
export interface NoteFilters {
  contactId?: string; // Filter by single contact
  contactIds?: string[]; // Filter by multiple contacts
  tags?: string[]; // Filter by tags (OR logic)
  isPinned?: boolean; // Show only pinned
  source?: NoteSource; // Filter by how created
  searchQuery?: string; // Full-text search
  dateFrom?: Date; // Created after
  dateTo?: Date; // Created before
}

/**
 * Note sort options
 */
export enum NoteSortBy {
  CREATED_DESC = "created_desc", // Newest first (default)
  CREATED_ASC = "created_asc", // Oldest first
  UPDATED_DESC = "updated_desc", // Recently updated
  PINNED_FIRST = "pinned_first", // Pinned, then by created desc
}

/**
 * Paginated note results
 */
export interface NotesPage {
  notes: Note[];
  total: number;
  hasMore: boolean;
  cursor?: string; // For cursor-based pagination
}

/**
 * Tag metadata (aggregated from all notes)
 */
export interface TagMetadata {
  tag: string;
  count: number; // How many notes use this tag
  lastUsed: Date;
}

/**
 * Note statistics (for reports/insights)
 */
export interface NoteStats {
  totalNotes: number;
  pinnedCount: number;
  voiceNotesCount: number;
  tagsUsed: number;
  averageLength: number; // Average content length
  notesThisWeek: number;
  notesThisMonth: number;
}

/**
 * Voice-to-text state
 */
export interface VoiceRecordingState {
  isRecording: boolean;
  duration: number; // Current recording duration in seconds
  transcript?: string; // Real-time or final transcript
  error?: string;
}

/**
 * AI processing state
 */
export interface AIProcessingState {
  isProcessing: boolean;
  progress?: number; // 0-100 for progress indication
  error?: string;
}

/**
 * Note with enriched contact data (for display)
 */
export interface NoteWithContacts extends Note {
  contacts: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}

/**
 * Search result with highlights
 */
export interface NoteSearchResult {
  note: Note;
  highlights: string[]; // Matching snippets
  score: number; // Relevance score
}
