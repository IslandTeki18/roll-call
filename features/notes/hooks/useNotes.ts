import { useCallback, useEffect, useRef, useState } from "react";
import { processNoteWithProgress } from "../api/notesProcessing.service";
import {
  createNote,
  deleteNote,
  getNote,
  getNotesByUser,
  getPinnedNotes,
  getUserTags,
  searchNotes,
  toggleNotePin,
  updateNote,
} from "../api/notes.service";
import { Note, CreateNoteInput, UpdateNoteInput } from "../types/notes.types";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";

const AUTOSAVE_DELAY_MS = 1500;

export function useNotes() {
  const { profile} = useUserProfile();
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);
      const [allNotes, pinned, tags] = await Promise.all([
        getNotesByUser(profile.$id),
        getPinnedNotes(profile.$id),
        getUserTags(profile.$id),
      ]);
      setNotes(allNotes);
      setPinnedNotes(pinned);
      setUserTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const search = useCallback(
    async (query: string): Promise<Note[]> => {
      if (!profile) return [];
      if (!query.trim()) {
        await loadNotes();
        return notes;
      }
      try {
        const results = await searchNotes(profile.$id, query);
        return results;
      } catch {
        return [];
      }
    },
    [profile, notes, loadNotes]
  );

  const create = useCallback(
    async (
      rawText: string,
      contactIds?: string[],
      tags?: string[],
      processWithAI: boolean = true
    ): Promise<Note | null> => {
      if (!profile) return null;

      try {
        const note = await createNote({
          userId: profile.$id,
          rawText,
          contactIds,
          tags,
        });

        setNotes((prev) => [note, ...prev]);

        if (processWithAI && rawText.trim().length > 10) {
          processNoteWithProgress(note.$id).catch(console.error);
        }

        await loadNotes();
        return note;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create note");
        return null;
      }
    },
    [profile, loadNotes]
  );

  const update = useCallback(
    async (noteId: string, input: UpdateNoteInput): Promise<Note | null> => {
      if (!profile) return null;

      try {
        const updated = await updateNote(noteId, input);
        setNotes((prev) => prev.map((n) => (n.$id === noteId ? updated : n)));

        if (input.rawText && input.rawText.trim().length > 10) {
          processNoteWithProgress(noteId).catch(console.error);
        }

        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update note");
        return null;
      }
    },
    [profile]
  );

  const remove = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.$id !== noteId));
      setPinnedNotes((prev) => prev.filter((n) => n.$id !== noteId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
      return false;
    }
  }, []);

  const togglePin = useCallback(
    async (noteId: string): Promise<Note | null> => {
      try {
        const updated = await toggleNotePin(noteId);
        setNotes((prev) => prev.map((n) => (n.$id === noteId ? updated : n)));
        if (updated.isPinned) {
          setPinnedNotes((prev) => [updated, ...prev]);
        } else {
          setPinnedNotes((prev) => prev.filter((n) => n.$id !== noteId));
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle pin");
        return null;
      }
    },
    []
  );

  return {
    notes,
    pinnedNotes,
    userTags,
    loading,
    error,
    loadNotes,
    search,
    create,
    update,
    remove,
    togglePin,
  };
}

export function useNoteEditor(noteId?: string) {
  const { profile } = useUserProfile();
  const [note, setNote] = useState<Note | null>(null);
  const [rawText, setRawText] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTextRef = useRef<string>("");

  // Load existing note
  useEffect(() => {
    if (noteId) {
      setLoading(true);
      getNote(noteId)
        .then((n) => {
          setNote(n);
          setRawText(n.rawText);
          setContactIds(
            n.contactIds ? n.contactIds.split(",").filter(Boolean) : []
          );
          setTags(n.tags ? n.tags.split(",").filter(Boolean) : []);
          setIsPinned(n.isPinned);
          lastSavedTextRef.current = n.rawText;
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load note");
        })
        .finally(() => setLoading(false));
    }
  }, [noteId]);

  // Autosave logic
  useEffect(() => {
    if (!note || !isDirty) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      if (rawText !== lastSavedTextRef.current) {
        await save();
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [rawText, isDirty, note]);

  const updateRawText = useCallback((text: string) => {
    setRawText(text);
    setIsDirty(true);
  }, []);

  const updateContactIds = useCallback((ids: string[]) => {
    setContactIds(ids);
    setIsDirty(true);
  }, []);

  const updateTags = useCallback((newTags: string[]) => {
    setTags(newTags);
    setIsDirty(true);
  }, []);

  const updatePinned = useCallback((pinned: boolean) => {
    setIsPinned(pinned);
    setIsDirty(true);
  }, []);

  const save = useCallback(async (): Promise<Note | null> => {
    if (!profile) return null;

    setSaving(true);
    setError(null);

    try {
      let savedNote: Note;

      if (note) {
        savedNote = await updateNote(note.$id, {
          rawText,
          contactIds,
          tags,
          isPinned,
        });
      } else {
        savedNote = await createNote({
          userId: profile.$id,
          rawText,
          contactIds,
          tags,
          isPinned,
        });
      }

      setNote(savedNote);
      lastSavedTextRef.current = rawText;
      setIsDirty(false);

      // Trigger AI processing for substantial text
      if (rawText.trim().length > 10) {
        processNoteWithProgress(savedNote.$id).catch(console.error);
      }

      return savedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
      return null;
    } finally {
      setSaving(false);
    }
  }, [profile, note, rawText, contactIds, tags, isPinned]);

  const reset = useCallback(() => {
    setNote(null);
    setRawText("");
    setContactIds([]);
    setTags([]);
    setIsPinned(false);
    setIsDirty(false);
    lastSavedTextRef.current = "";
  }, []);

  return {
    note,
    rawText,
    contactIds,
    tags,
    isPinned,
    loading,
    saving,
    error,
    isDirty,
    updateRawText,
    updateContactIds,
    updateTags,
    updatePinned,
    save,
    reset,
  };
}
