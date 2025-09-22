
// //preload.js
// const { contextBridge, ipcRenderer } = require("electron");
// const fs = require("fs");
// const path = require("path");
// const { app } = require("electron"); // Ensure app is required

// contextBridge.exposeInMainWorld("voiceAPI", {
//   // ✅ Start voice listening
//   startListening: () => ipcRenderer.send("voice-start"),

//   // ✅ Stop voice listening
//   stopListening: () => ipcRenderer.send("voice-stop"),

//   // ✅ Listen for recognized voice commands
//   onCommand: (callback) => {
//     ipcRenderer.on("voice-command", (_, command) => callback(command));
//   },

//   // ✅ Pick a file by name from Downloads folder
//   getFile: async (fileName) => {
//     const downloadsPath = app.getPath("downloads");
//     const fullPath = path.join(downloadsPath, fileName);
//     if (fs.existsSync(fullPath)) {
//       return fs.readFileSync(fullPath, "utf-8");
//     } else {
//       return null;
//     }
//   },

//   // ✅ Open the Downloads folder
//   openDownloads: () => ipcRenderer.send("open-downloads"),
// });


//--------------------------------------------------------------------------------------------------------------


//electron>preload.js
const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { app } = require("electron"); // Ensure app is required

contextBridge.exposeInMainWorld("voiceAPI", {
  // ✅ Start voice listening
  startListening: () => ipcRenderer.send("voice-start"),

  // ✅ Stop voice listening
  stopListening: () => ipcRenderer.send("voice-stop"),

  // ✅ Listen for recognized voice commands
  onCommand: (callback) => {
    ipcRenderer.on("voice-command", (_, command) => callback(command));
  },

  // ✅ Pick a file by name from Downloads folder
  getFile: async (fileName) => {
    const downloadsPath = app.getPath("downloads");
    const fullPath = path.join(downloadsPath, fileName);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    } else {
      return null;
    }
  },

  // ✅ Open the Downloads folder
  openDownloads: () => ipcRenderer.send("open-downloads"),
});

