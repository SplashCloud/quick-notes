const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notesApi", {
  getState: () => ipcRenderer.invoke("notes:get-state"),
  createNote: (payload) => ipcRenderer.invoke("notes:create", payload),
  updateNote: (id, patch) => ipcRenderer.invoke("notes:update", id, patch),
  deleteNote: (id) => ipcRenderer.invoke("notes:delete", id),
  openNoteWindow: (id) => ipcRenderer.invoke("notes:open-window", id),
  createNoteWindow: () => ipcRenderer.invoke("notes:create-window"),
  focusMainWindow: () => ipcRenderer.invoke("app:focus-main"),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("notes:state-changed", listener);
    return () => ipcRenderer.removeListener("notes:state-changed", listener);
  }
});
