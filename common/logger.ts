/**
 * Unified logger module for PraiseProjector
 * Works in both browser (renderer) and Node.js (electron main)
 *
 * Overrides console.log/info/warn/error/debug to:
 * - Add timestamps
 * - Filter by log level
 * - Store entries in a buffer for the log viewer
 */

/**
 * Log levels for the application logger.
 * Lower values are more verbose.
 */
export enum LogLevel {
  /** Most verbose - shows all logs including debug traces */
  Debug = 0,
  /** General information about app operation */
  Info = 1,
  /** Warnings that don't prevent operation */
  Warn = 2,
  /** Errors that may affect functionality */
  Error = 3,
  /** No logging at all */
  None = 4,
}

export interface LogEntry {
  timestamp: number;
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  args: unknown[];
}

// Log buffer for log viewer
const MAX_LOG_ENTRIES = 1000;
const logBuffer: LogEntry[] = [];

// Subscribers for real-time log updates
type LogSubscriber = (entry: LogEntry) => void;
const subscribers: LogSubscriber[] = [];

// Store original console methods before overriding
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Format timestamp as HH:MM:SS.FFF
function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const millis = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

/**
 * Add a log entry to the buffer and notify subscribers
 */
function addLogEntry(level: LogEntry["level"], args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
    args: args.map((arg) => {
      if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: arg.stack };
      }
      try {
        // Test if serializable
        JSON.stringify(arg);
        return arg;
      } catch {
        return String(arg);
      }
    }),
  };

  logBuffer.push(entry);

  // Trim buffer if it exceeds max size
  while (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }

  // Notify subscribers
  for (const subscriber of subscribers) {
    try {
      subscriber(entry);
    } catch {
      // Ignore subscriber errors
    }
  }
}

/**
 * Get all log entries from the buffer
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Clear all log entries from the buffer
 */
export function clearLogs(): void {
  logBuffer.length = 0;
  originalConsole.log(`[${formatTimestamp(new Date())}]`, "[Logger] Logs cleared");
}

/**
 * Subscribe to real-time log updates
 * Returns an unsubscribe function
 */
export function subscribeToLogs(callback: LogSubscriber): () => void {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  };
}

let interceptorInstalled = false;

/**
 * Install console interceptor to capture all console output
 * This overrides console.log/info/warn/error/debug globally
 */
export function installConsoleInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  // In webapp mode there is no IPC/log viewer, so pass through to the real console.
  // In Electron mode logs reach DevTools via the IPC subscriber set up in main.tsx.
  const isWebApp = typeof window !== "undefined" && !(window as { electronAPI?: unknown }).electronAPI;

  console.log = (...args: unknown[]) => {
    addLogEntry("log", args);
    if (isWebApp) originalConsole.log(...args);
  };

  console.info = (...args: unknown[]) => {
    addLogEntry("info", args);
    if (isWebApp) originalConsole.info(...args);
  };

  console.warn = (...args: unknown[]) => {
    addLogEntry("warn", args);
    if (isWebApp) originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    addLogEntry("error", args);
    if (isWebApp) originalConsole.error(...args);
  };

  console.debug = (...args: unknown[]) => {
    addLogEntry("debug", args);
    if (isWebApp) originalConsole.debug(...args);
  };

  originalConsole.log(`[${formatTimestamp(new Date())}]`, "[Logger] Console interceptor installed");
}

/**
 * Get original console methods (useful for logging that should bypass filtering)
 */
export const originalConsoleMethods = originalConsole;
