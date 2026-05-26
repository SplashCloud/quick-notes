import { CalendarDays, ChevronLeft, ChevronRight, Edit3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotesState, StickyNote } from "./types";

const colors = ["#fff2a8", "#ffd6d6", "#d8f5d2", "#d7ecff", "#eadcff", "#ffe2bf"];

const emptyState: NotesState = {
  notes: [],
  hotkey: "CommandOrControl+Shift+N",
  platform: "",
  dataPath: ""
};

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function wordCount(markdown: string) {
  const cjk = markdown.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = markdown.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+(?:[-'][A-Za-z0-9_]+)*/g)?.length ?? 0;
  return cjk + words;
}

function formatHotkey(value: string) {
  return value.replace("CommandOrControl", "⌘").replace(/\+/g, " + ");
}

function useNotesState() {
  const [state, setState] = useState<NotesState>(emptyState);

  useEffect(() => {
    window.notesApi.getState().then(setState);
    return window.notesApi.onStateChanged(setState);
  }, []);

  return state;
}

function monthDays(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function App() {
  const route = window.location.hash || "#/";
  const noteMatch = route.match(/^#\/note\/(.+)$/);
  const state = useNotesState();

  if (noteMatch) {
    return <NoteWindow noteId={noteMatch[1]} state={state} />;
  }

  return <MainWindow state={state} />;
}

function MainWindow({ state }: { state: NotesState }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const days = useMemo(() => monthDays(cursor), [cursor]);
  const stats = useMemo(() => {
    const map = new Map<string, { notes: number; words: number }>();
    for (const note of state.notes) {
      const key = dateKey(note.createdAt);
      const current = map.get(key) ?? { notes: 0, words: 0 };
      current.notes += 1;
      current.words += wordCount(note.content);
      map.set(key, current);
    }
    return map;
  }, [state.notes]);

  const selectedNotes = state.notes.filter((note) => dateKey(note.createdAt) === selectedDate);
  const monthLabel = `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`;

  const moveMonth = (delta: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Quick Notes</h1>
          <p>{formatHotkey(state.hotkey)} 新建便利贴</p>
        </div>
        <button className="primary-button" onClick={() => window.notesApi.createNoteWindow()}>
          <Plus size={18} />
          新建
        </button>
      </header>

      <section className="dashboard">
        <div className="calendar-panel">
          <div className="calendar-head">
            <button className="icon-button" aria-label="上个月" onClick={() => moveMonth(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div className="month-title">
              <CalendarDays size={18} />
              {monthLabel}
            </div>
            <button className="icon-button" aria-label="下个月" onClick={() => moveMonth(1)}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="weekdays">
            {["日", "一", "二", "三", "四", "五", "六"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const item = stats.get(key);
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isSelected = key === selectedDate;
              return (
                <button
                  key={key}
                  className={`day-cell ${isCurrentMonth ? "" : "muted"} ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  {item ? (
                    <span className="day-stat">
                      {item.notes} 张 · {item.words} 字
                    </span>
                  ) : (
                    <span className="day-empty"> </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="notes-panel">
          <div className="notes-panel-head">
            <div>
              <h2>{selectedDate}</h2>
              <p>{selectedNotes.length} 张便利贴</p>
            </div>
            <button className="icon-button" aria-label="为当天新建" onClick={() => window.notesApi.createNoteWindow()}>
              <Plus size={20} />
            </button>
          </div>

          <div className="note-list">
            {selectedNotes.length === 0 ? (
              <div className="empty">
                <Edit3 size={28} />
                <span>这一天还没有记录</span>
              </div>
            ) : (
              selectedNotes.map((note) => <NoteCard key={note.id} note={note} />)
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function NoteCard({ note }: { note: StickyNote }) {
  const preview = note.content.trim() || "空白便利贴";

  return (
    <article className="note-card" style={{ backgroundColor: note.color }}>
      <button className="note-card-body" onClick={() => window.notesApi.openNoteWindow(note.id)}>
        <strong>{preview.split("\n")[0]}</strong>
        <span>{wordCount(note.content)} 字 · {new Date(note.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
      </button>
      <button className="delete-button" aria-label="删除" onClick={() => window.notesApi.deleteNote(note.id)}>
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function NoteWindow({ noteId, state }: { noteId: string; state: NotesState }) {
  const note = state.notes.find((item) => item.id === noteId);
  const [draft, setDraft] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) setDraft(note.content);
  }, [note?.id]);

  useEffect(() => {
    editorRef.current?.focus();
  }, [note?.id]);

  useEffect(() => {
    if (!note || draft === note.content) return;
    const timer = window.setTimeout(() => {
      window.notesApi.updateNote(note.id, { content: draft });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, note]);

  if (!note) return null;

  return (
    <main className="sticky-window" style={{ backgroundColor: note.color }}>
      <header className="sticky-toolbar">
        <div className="color-row">
          {colors.map((color) => (
            <button
              key={color}
              className={`swatch ${color === note.color ? "active" : ""}`}
              style={{ backgroundColor: color }}
              aria-label={`颜色 ${color}`}
              onClick={() => window.notesApi.updateNote(note.id, { color })}
            />
          ))}
        </div>
        <div className="window-actions">
          <button aria-label="打开主界面" onClick={() => window.notesApi.focusMainWindow()}>
            <CalendarDays size={16} />
          </button>
          <button aria-label="关闭" onClick={() => window.close()}>
            <X size={16} />
          </button>
        </div>
      </header>
      <textarea
        ref={editorRef}
        className="sticky-editor"
        value={draft}
        autoFocus
        spellCheck={false}
        placeholder="写点什么..."
        onChange={(event) => setDraft(event.target.value)}
      />
      <footer className="sticky-footer">{wordCount(draft)} 字</footer>
    </main>
  );
}

export default App;
