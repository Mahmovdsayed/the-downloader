import { app, BrowserWindow, shell, session } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function resolvePreloadPath(): string {
  const jsPath = path.join(__dirname, "../preload/index.js");
  if (fs.existsSync(jsPath)) return jsPath;
  const mjsPath = path.join(__dirname, "../preload/index.mjs");
  if (fs.existsSync(mjsPath)) return mjsPath;
  const cjsPath = path.join(__dirname, "../preload/index.cjs");
  if (fs.existsSync(cjsPath)) return cjsPath;
  return jsPath;
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 1080,
    minHeight: 720,
    title: "Local Video Downloader",
    roundedCorners: true,
    backgroundColor: "#090d16",
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: resolvePreloadPath(),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Security: Restrict in-window navigation
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const isDevUrl =
      process.env.VITE_DEV_SERVER_URL &&
      navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL);
    const isLocalFile = navigationUrl.startsWith("file://");
    if (!isDevUrl && !isLocalFile) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Load UI
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function setupSecurityHeaders(): void {
  // Apply a restrictive Content-Security-Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' http: ws:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none';";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}
