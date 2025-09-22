
//Voice -based

//electron.cjs

// const { app, BrowserWindow, ipcMain, shell } = require("electron");
// const path = require("path");
// const fs = require("fs");

// let mainWindow;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1400,
//     height: 900,
//     webPreferences: {
//       preload: path.join(__dirname, "electron", "preload.js"),
//       nodeIntegration: false,
//       contextIsolation: true,
//     },
//   });

//   // Load React frontend
//   if (process.env.ELECTRON_DEV) {
//     mainWindow.loadURL("http://localhost:8080");
//   } else {
//     mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
//   }
// }

// // ----------------------
// // Electron app ready
// // ----------------------
// app.whenReady().then(() => {
//   createWindow();

//   // ----------------------
//   // Voice recognition events
//   // ----------------------
//   ipcMain.on("voice-start", async () => {
//     console.log("Voice listening started");

//     // Example pseudo code to simulate recognized commands
//     // Replace with real microphone + speech-to-text integration
//     setTimeout(() => {
//       const command = "Audio Tab"; // Example recognized command
//       mainWindow.webContents.send("voice-command", command);
//     }, 3000);
//   });

//   ipcMain.on("voice-stop", () => {
//     console.log("Voice listening stopped");
//     // Stop microphone / recognition here
//   });

//   // ----------------------
//   // Open downloads folder
//   // ----------------------
//   ipcMain.on("open-downloads", () => {
//     const downloadsPath = app.getPath("downloads");
//     shell.openPath(downloadsPath).then(() => {
//       console.log("Downloads folder opened");
//     });
//   });

//   // ----------------------
//   // Fetch file by name from Downloads
//   // ----------------------
//   ipcMain.handle("get-file", async (event, fileName) => {
//     const downloadsPath = app.getPath("downloads");
//     const fullPath = path.join(downloadsPath, fileName);

//     if (fs.existsSync(fullPath)) {
//       return fs.readFileSync(fullPath, "utf-8");
//     } else {
//       return null;
//     }
//   });
// });

// // ----------------------
// // Close behavior
// // ----------------------
// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") app.quit();
// });

// app.on("activate", () => {
//   if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });

//------------------------------------------------------------------------------------------------------------------
// electron.cjs

//electron.cjs

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "electron", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load React frontend
  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL("http://localhost:8080");
  } else {
    mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  }
}

// ----------------------
// Electron app ready
// ----------------------
app.whenReady().then(() => {
  createWindow();

  // ----------------------
  // Voice recognition events
  // ----------------------
  ipcMain.on("voice-start", async () => {
    console.log("Voice listening started");

    // Example pseudo code to simulate recognized commands
    // Replace with real microphone + speech-to-text integration
    setTimeout(() => {
      const command = "Audio Tab"; // Example recognized command
      mainWindow.webContents.send("voice-command", command);
    }, 3000);
  });

  ipcMain.on("voice-stop", () => {
    console.log("Voice listening stopped");
    // Stop microphone / recognition here
  });

  // ----------------------
  // Open downloads folder
  // ----------------------
  ipcMain.on("open-downloads", () => {
    const downloadsPath = app.getPath("downloads");
    shell.openPath(downloadsPath).then(() => {
      console.log("Downloads folder opened");
    });
  });

  // ----------------------
  // Fetch file by name from Downloads
  // ----------------------
  ipcMain.handle("get-file", async (event, fileName) => {
    const downloadsPath = app.getPath("downloads");
    const fullPath = path.join(downloadsPath, fileName);

    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    } else {
      return null;
    }
  });
});

// ----------------------
// Close behavior
// ----------------------
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});