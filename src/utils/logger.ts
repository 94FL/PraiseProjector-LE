/**
 * Re-export from common/logger.ts for backwards compatibility
 * All logging is now handled through console override in common/logger.ts
 */
export { LogLevel, type LogEntry, getLogs, clearLogs, subscribeToLogs, installConsoleInterceptor, originalConsoleMethods } from "../../common/logger";
