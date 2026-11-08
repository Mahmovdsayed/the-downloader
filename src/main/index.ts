import { app, BrowserWindow } from "electron";
import {
  createMainWindow,
  setupSecurityHeaders,
  getMainWindow,
} from "./app/lifecycle.js";
import { registerAllIpcHandlers } from "./ipc/index.js";
import { UpdaterService } from "./services/updater/updater.service.js";

// Enforce single instance lock
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Initialize background services and IPC routing
  UpdaterService.initialize();
  registerAllIpcHandlers();

  app.whenReady().then(() => {
    setupSecurityHeaders();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
