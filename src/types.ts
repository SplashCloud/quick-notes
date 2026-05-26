export type StickyNote = {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NotesState = {
  notes: StickyNote[];
  hotkey: string;
  platform: string;
  dataPath: string;
};

export type NotesApi = {
  getState: () => Promise<NotesState>;
  createNote: (payload?: Partial<StickyNote>) => Promise<StickyNote>;
  updateNote: (id: string, patch: Partial<StickyNote>) => Promise<StickyNote | undefined>;
  deleteNote: (id: string) => Promise<NotesState>;
  openNoteWindow: (id: string) => Promise<StickyNote>;
  createNoteWindow: () => Promise<StickyNote>;
  focusMainWindow: () => Promise<void>;
  onStateChanged: (callback: (state: NotesState) => void) => () => void;
};

declare global {
  interface Window {
    notesApi: NotesApi;
  }
}
