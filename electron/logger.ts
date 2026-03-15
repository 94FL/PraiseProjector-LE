/**
 * Electron-specific logger module
 * Handles IPC for log access and log viewer window management
 * Uses common/logger.ts for actual logging implementation
 */
import { ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { installConsoleInterceptor, getLogs, clearLogs, subscribeToLogs, originalConsoleMethods, type LogEntry } from "../common/logger";
import { setLogFunction } from "../common/pp-log";

// Re-export for backwards compatibility
export { getLogs, clearLogs, LogEntry };

let logViewerWindow: BrowserWindow | null = null;

/** Tagged log entry with source info for the unified log viewer */
interface TaggedLogEntry extends LogEntry {
  source: "frontend" | "backend";
}

// Separate buffer for frontend log entries received via IPC
const MAX_FRONTEND_ENTRIES = 1000;
const frontendLogBuffer: TaggedLogEntry[] = [];

/** Forward a tagged entry to the log viewer window */
function forwardToLogViewer(entry: TaggedLogEntry): void {
  if (logViewerWindow && !logViewerWindow.isDestroyed() && logViewerWindow.webContents) {
    logViewerWindow.webContents.send("logs:entry", entry);
  }
}

// Install console interceptor and set up log viewer notifications
export function installLoggerInterceptor(): void {
  // Install the common logger interceptor first so console.* are already replaced
  installConsoleInterceptor();

  // Route pp-log (used by common/ and server/ code) through the intercepted console
  // methods so those messages reach the log buffer and log viewer with correct levels.
  setLogFunction((message, level) => {
    if (level === "warn") console.warn(message);
    else if (level === "error") console.error(message);
    else console.info(message);
  });

  // Subscribe to backend logs and forward to log viewer window
  subscribeToLogs((entry: LogEntry) => {
    const tagged: TaggedLogEntry = { ...entry, source: "backend" };
    forwardToLogViewer(tagged);
  });
}

/** Accept a frontend log entry received via IPC from the renderer */
function acceptFrontendEntry(entry: { timestamp: number; level: string; message: string; args?: unknown[] }): void {
  const tagged: TaggedLogEntry = {
    timestamp: entry.timestamp,
    level: entry.level as LogEntry["level"],
    message: entry.message,
    args: entry.args ?? [],
    source: "frontend",
  };
  frontendLogBuffer.push(tagged);
  while (frontendLogBuffer.length > MAX_FRONTEND_ENTRIES) {
    frontendLogBuffer.shift();
  }
  forwardToLogViewer(tagged);
}

/** Get all logs (backend + frontend) sorted by timestamp */
function getAllLogs(): TaggedLogEntry[] {
  const backendLogs: TaggedLogEntry[] = getLogs().map((e) => ({ ...e, source: "backend" as const }));
  const all = [...backendLogs, ...frontendLogBuffer];
  all.sort((a, b) => a.timestamp - b.timestamp);
  return all;
}

// Open log viewer in a separate window
export function openLogViewerWindow(): void {
  // If window already exists, focus it
  if (logViewerWindow && !logViewerWindow.isDestroyed()) {
    logViewerWindow.focus();
    return;
  }

  logViewerWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: "Logs",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Load the log viewer route
  if (process.env.VITE_DEV_SERVER_URL) {
    logViewerWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/logs`);
  } else {
    logViewerWindow.loadFile(path.join(__dirname, "../webapp/index.html"), { hash: "/logs" });
  }

  logViewerWindow.setMenu(null);
  logViewerWindow.setMenuBarVisibility(false);

  logViewerWindow.on("closed", () => {
    logViewerWindow = null;
  });

  // Open DevTools with F12
  logViewerWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      logViewerWindow?.webContents.toggleDevTools();
    }
  });
}

// Setup IPC handlers for log access from renderer
export function setupLoggerIPC(): void {
  ipcMain.handle("logs:get", () => {
    return getAllLogs();
  });

  ipcMain.handle("logs:clear", () => {
    clearLogs();
    frontendLogBuffer.length = 0;
    return true;
  });

  ipcMain.handle("logs:open-window", () => {
    openLogViewerWindow();
    return true;
  });

  // Receive frontend log entries from renderer
  ipcMain.on("logs:frontend-entry", (_event, entry) => {
    acceptFrontendEntry(entry);
  });

  originalConsoleMethods.log("[Logger] IPC handlers registered");
}

// Close the log viewer window if it exists
export function closeLogViewerWindow(): void {
  if (logViewerWindow && !logViewerWindow.isDestroyed()) {
    logViewerWindow.close();
    logViewerWindow = null;
  }
}

/**
 * @deprecated Use console.log/debug/info/warn/error directly
 * This is kept for backwards compatibility with existing code
 */
export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
