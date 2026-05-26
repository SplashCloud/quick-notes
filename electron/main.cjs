const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const hotkey = "CommandOrControl+Shift+N";

let mainWindow;
const noteWindows = new Map();
let state = { notes: [] };
let dataPath;

function nowIso() {
  return new Date().toISOString();
}

function ensureDataFile() {
  dataPath = path.join(app.getPath("userData"), "notes.json");
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
    return;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    state = { notes: Array.isArray(parsed.notes) ? parsed.notes : [] };
  } catch {
    const backup = `${dataPath}.${Date.now()}.broken`;
    fs.copyFileSync(dataPath, backup);
    state = { notes: [] };
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
  }
}

function persist() {
  fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
}

function publicState() {
  return {
    notes: [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    hotkey,
    platform: process.platform,
    dataPath
  };
}

function broadcastState() {
  const payload = publicState();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send("notes:state-changed", payload);
  });
}

function loadRenderer(win, route) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}${route}`);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: route.replace(/^#/, "") });
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    title: "快捷便利贴",
    backgroundColor: "#f6f4ec",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  loadRenderer(mainWindow, "#/");
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

function noteDefaults() {
  const display = screen.getPrimaryDisplay().workArea;
  return {
    id: crypto.randomUUID(),
    content: "",
    color: "#fff2a8",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    x: Math.round(display.x + display.width - 420),
    y: Math.round(display.y + 96),
    width: 360,
    height: 360
  };
}

function createNote(patch = {}) {
  const note = { ...noteDefaults(), ...patch };
  state.notes.unshift(note);
  persist();
  broadcastState();
  return note;
}

function findNote(id) {
  return state.notes.find((note) => note.id === id);
}

function createNoteWindow(id) {
  let note = id ? findNote(id) : undefined;
  if (!note) note = createNote();

  const existing = noteWindows.get(note.id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return note;
  }

  const win = new BrowserWindow({
    width: note.width,
    height: note.height,
    x: note.x,
    y: note.y,
    minWidth: 260,
    minHeight: 240,
    title: "便利贴",
    frame: false,
    alwaysOnTop: true,
    backgroundColor: note.color,
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  noteWindows.set(note.id, win);
  loadRenderer(win, `#/note/${note.id}`);

  const saveBounds = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    const current = findNote(note.id);
    if (!current) return;
    Object.assign(current, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      updatedAt: nowIso()
    });
    persist();
    broadcastState();
  };

  win.on("moved", saveBounds);
  win.on("resized", saveBounds);
  win.on("closed", () => noteWindows.delete(note.id));
  return note;
}

function registerIpc() {
  ipcMain.handle("notes:get-state", () => publicState());
  ipcMain.handle("notes:create", (_event, patch) => createNote(patch));
  ipcMain.handle("notes:create-window", () => createNoteWindow());
  ipcMain.handle("notes:open-window", (_event, id) => createNoteWindow(id));
  ipcMain.handle("notes:update", (_event, id, patch) => {
    const note = findNote(id);
    if (!note) return undefined;
    Object.assign(note, patch, { updatedAt: nowIso() });
    persist();
    const win = noteWindows.get(id);
    if (patch.color && win && !win.isDestroyed()) win.setBackgroundColor(patch.color);
    broadcastState();
    return note;
  });
  ipcMain.handle("notes:delete", (_event, id) => {
    state.notes = state.notes.filter((note) => note.id !== id);
    const win = noteWindows.get(id);
    if (win && !win.isDestroyed()) win.close();
    persist();
    broadcastState();
    return publicState();
  });
  ipcMain.handle("app:focus-main", () => {
    if (!mainWindow) createMainWindow();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  ensureDataFile();
  registerIpc();
  createMainWindow();

  globalShortcut.register(hotkey, () => {
    createNoteWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
