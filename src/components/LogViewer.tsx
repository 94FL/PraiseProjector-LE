import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocalization } from "../localization/LocalizationContext";
import { useSettings } from "../hooks/useSettings";
import type { LogEntry } from "../types/electron.d";
import "./LogViewer.css";

interface LogViewerProps {
  onClose: () => void;
}

type LogSource = "frontend" | "backend";

interface UnifiedLogEntry extends LogEntry {
  source: LogSource;
  uid: string;
}

interface DisplayLogEntry extends UnifiedLogEntry {
  originalIndex: number;
  isPinned?: boolean;
}

interface ObjectNodeProps {
  name?: string;
  value: unknown;
  defaultExpanded?: boolean;
  depth?: number;
}

const ObjectNode: React.FC<ObjectNodeProps> = ({ name, value, defaultExpanded = false, depth = 0 }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = useCallback(() => setExpanded((e) => !e), []);

  if (value === null)
    return (
      <span className="log-obj-leaf">
        {name != null && <span className="log-obj-key">{name}: </span>}
        <span className="log-obj-null">null</span>
      </span>
    );
  if (value === undefined)
    return (
      <span className="log-obj-leaf">
        {name != null && <span className="log-obj-key">{name}: </span>}
        <span className="log-obj-null">undefined</span>
      </span>
    );

  if (typeof value === "object" && !(value instanceof Date)) {
    const isArray = Array.isArray(value);
    const entries = isArray ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    const preview = isArray
      ? `Array(${entries.length})`
      : `{${entries
          .slice(0, 3)
          .map(([k]) => k)
          .join(", ")}${entries.length > 3 ? ", …" : ""}}`;

    if (entries.length === 0) {
      return (
        <span className="log-obj-leaf">
          {name != null && <span className="log-obj-key">{name}: </span>}
          {isArray ? "[]" : "{}"}
        </span>
      );
    }

    return (
      <span className="log-obj-node">
        <span className="log-obj-toggle" onClick={toggle}>
          {expanded ? "▼" : "▶"}
        </span>
        {name != null && (
          <span className="log-obj-key" onClick={toggle}>
            {name}:{" "}
          </span>
        )}
        {!expanded && (
          <span className="log-obj-preview" onClick={toggle}>
            {preview}
          </span>
        )}
        {expanded && (
          <span className="log-obj-children">
            {isArray ? "[" : "{"}
            {entries.map(([k, v]) => (
              <span key={k} className="log-obj-child" data-depth={depth + 1}>
                <ObjectNode name={isArray ? `[${k}]` : k} value={v} depth={depth + 1} />
              </span>
            ))}
            {isArray ? "]" : "}"}
          </span>
        )}
      </span>
    );
  }

  // Primitives
  const cls =
    typeof value === "string"
      ? "log-obj-string"
      : typeof value === "number"
        ? "log-obj-number"
        : typeof value === "boolean"
          ? "log-obj-bool"
          : "log-obj-other";
  const display = typeof value === "string" ? `"${value}"` : String(value);

  return (
    <span className="log-obj-leaf">
      {name != null && <span className="log-obj-key">{name}: </span>}
      <span className={cls}>{display}</span>
    </span>
  );
};

/** Render a single arg: strings inline, objects as collapsible tree */
const ArgRenderer: React.FC<{ arg: unknown; index: number; autoExpand?: boolean }> = ({ arg, index, autoExpand = false }) => {
  if (arg === null || arg === undefined)
    return (
      <>
        {index > 0 ? " " : ""}
        <span className="log-obj-null">{String(arg)}</span>
      </>
    );
  if (typeof arg !== "object")
    return (
      <>
        {index > 0 ? " " : ""}
        {String(arg)}
      </>
    );
  return (
    <>
      {index > 0 ? " " : ""}
      <ObjectNode value={arg} defaultExpanded={autoExpand} />
    </>
  );
};

// ── LogViewer Component ──────────────────────────────────────────────────────

let uidCounter = 0;
function nextUid(): string {
  return `lv-${++uidCounter}`;
}

/** Map level strings to numeric severity (higher = more severe) */
const LEVEL_SEVERITY: Record<string, number> = { debug: 0, log: 1, info: 2, warn: 3, error: 4 };

/** Highlight occurrences of `term` within `text` */
function highlightText(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="log-filter-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const LogViewer: React.FC<LogViewerProps> = ({ onClose }) => {
  const { t } = useLocalization();
  const { settings, updateSettingWithAutoSave } = useSettings();
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  /** Load all logs from backend (includes both BE and FE entries, pre-tagged) */
  const loadAllLogs = useCallback(async (): Promise<UnifiedLogEntry[]> => {
    if (!window.electronAPI?.logs) return [];
    const entries = await window.electronAPI.logs.get();
    return entries.map((e) => ({
      ...e,
      source: (e.source ?? "backend") as LogSource,
      uid: nextUid(),
    }));
  }, []);

  // Load initial logs
  useEffect(() => {
    loadAllLogs().then(setLogs);
  }, [loadAllLogs]);

  // Subscribe to new log entries (backend tags them with source)
  useEffect(() => {
    if (!window.electronAPI?.logs) return;
    const unsubscribe = window.electronAPI.logs.onEntry((entry: LogEntry) => {
      setLogs((prev) => [...prev, { ...entry, source: (entry.source ?? "backend") as LogSource, uid: nextUid() }]);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClear = useCallback(async () => {
    if (window.electronAPI?.logs) await window.electronAPI.logs.clear();
    setLogs([]);
    setExpandedRows(new Set());
  }, []);

  const handleRefresh = useCallback(async () => {
    setLogs(await loadAllLogs());
  }, [loadAllLogs]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      "." +
      date.getMilliseconds().toString().padStart(3, "0")
    );
  };

  const getLevelClass = (level: string): string => {
    switch (level) {
      case "error":
        return "log-level-error";
      case "warn":
        return "log-level-warn";
      case "info":
        return "log-level-info";
      case "debug":
        return "log-level-debug";
      default:
        return "log-level-log";
    }
  };

  /** Whether entry has content worth expanding (multiline or object args) */
  const isExpandable = (log: UnifiedLogEntry): boolean => {
    if (log.message.includes("\n")) return true;
    if (log.args?.some((a) => a !== null && a !== undefined && typeof a === "object")) return true;
    return false;
  };

  const getFirstLine = (message: string): string => {
    const nl = message.indexOf("\n");
    return nl >= 0 ? message.substring(0, nl) : message;
  };

  // Build display list: filtered logs + pinned selected row if not matching filter
  const displayLogs: DisplayLogEntry[] = useMemo(() => {
    const result: DisplayLogEntry[] = [];
    let selectedIncluded = false;

    const minSeverity = levelFilter === "all" ? -1 : (LEVEL_SEVERITY[levelFilter] ?? -1);

    logs.forEach((log, originalIndex) => {
      const matchesLevel = minSeverity < 0 || (LEVEL_SEVERITY[log.level] ?? 0) >= minSeverity;
      const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
      const matchesText = filter === "" || log.message.toLowerCase().includes(filter.toLowerCase());

      if (matchesLevel && matchesSource && matchesText) {
        result.push({ ...log, originalIndex });
        if (originalIndex === selectedIndex) selectedIncluded = true;
      }
    });

    if (selectedIndex !== null && !selectedIncluded && selectedIndex < logs.length) {
      const pinnedLog: DisplayLogEntry = { ...logs[selectedIndex], originalIndex: selectedIndex, isPinned: true };
      let insertPos = result.findIndex((l) => l.originalIndex > selectedIndex);
      if (insertPos === -1) insertPos = result.length;
      result.splice(insertPos, 0, pinnedLog);
    }

    return result;
  }, [logs, filter, levelFilter, sourceFilter, selectedIndex]);

  // Scroll selected row into view when filter changes
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [filter, levelFilter, sourceFilter]);

  const handleRowClick = useCallback((originalIndex: number) => {
    setSelectedIndex((prev) => (prev === originalIndex ? null : originalIndex));
    setAutoScroll(false);
  }, []);

  const toggleExpand = useCallback((uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  /** Render text with filter highlighting */
  const hl = useCallback((text: string) => highlightText(text, filter), [filter]);

  /** Render log message cell: collapsed (first line) or expanded (full + arg trees) */
  const renderMessage = useCallback(
    (log: DisplayLogEntry) => {
      const expanded = expandedRows.has(log.uid);
      const expandable = isExpandable(log);
      const hasObjectArgs = log.args?.some((a) => a !== null && a !== undefined && typeof a === "object");
      const autoExpandParams = settings?.logAutoExpandParams ?? true;

      if (!expandable) {
        return <span className="log-msg-text">{hl(log.message)}</span>;
      }

      if (!expanded) {
        return (
          <span className="log-msg-collapsed">
            <span className="log-expand-toggle" onClick={(e) => toggleExpand(log.uid, e)} title="Click to expand">
              ▶
            </span>
            <span className="log-msg-text">{hl(getFirstLine(log.message))}</span>
            {log.message.includes("\n") && <span className="log-msg-more"> …</span>}
          </span>
        );
      }

      return (
        <span className="log-msg-expanded">
          <span className="log-expand-toggle" onClick={(e) => toggleExpand(log.uid, e)} title="Click to collapse">
            ▼
          </span>
          {hasObjectArgs && log.args ? (
            <span className="log-msg-args">
              {log.args.map((arg, i) => (
                <ArgRenderer key={i} arg={arg} index={i} autoExpand={autoExpandParams} />
              ))}
            </span>
          ) : (
            <pre className="log-message-pre">{hl(log.message)}</pre>
          )}
        </span>
      );
    },
    [expandedRows, toggleExpand, settings?.logAutoExpandParams, hl]
  );

  return (
    <div className="log-viewer-backdrop">
      <div ref={dialogRef} className="log-viewer-dialog">
        <div className="log-viewer-header">
          <h5 className="log-viewer-title">{t("LogViewer")}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="log-viewer-toolbar">
          <input
            type="text"
            className="form-control form-control-sm log-filter-input"
            placeholder={t("FilterLogs")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="form-select form-select-sm log-level-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            title={t("Level")}
            aria-label={t("Level")}
          >
            <option value="all">{t("AllLevels")}</option>
            <option value="error">{t("ErrorAndAbove")}</option>
            <option value="warn">{t("WarnAndAbove")}</option>
            <option value="info">{t("InfoAndAbove")}</option>
            <option value="log">{t("LogAndAbove")}</option>
            <option value="debug">{t("Debug")}</option>
          </select>
          <select
            className="form-select form-select-sm log-source-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            title="Source"
            aria-label="Source"
          >
            <option value="all">All Sources</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
          </select>
          <div className="form-check log-autoscroll-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="autoExpandParamsCheck"
              checked={settings?.logAutoExpandParams ?? true}
              onChange={(e) => updateSettingWithAutoSave("logAutoExpandParams", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="autoExpandParamsCheck">
              {t("SettingsLogAutoExpandParams")}
            </label>
          </div>
          <div className="form-check log-autoscroll-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="autoScrollCheck"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="autoScrollCheck">
              {t("AutoScroll")}
            </label>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={handleRefresh}>
            {t("Refresh")}
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={handleClear}>
            {t("ClearLogs")}
          </button>
        </div>
        <div className="log-viewer-body" ref={logContainerRef}>
          {displayLogs.length === 0 ? (
            <div className="log-empty-message">{t("NoLogs")}</div>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th className="log-col-time">{t("Time")}</th>
                  <th className="log-col-source">Src</th>
                  <th className="log-col-level">{t("Level")}</th>
                  <th className="log-col-message">{t("Message")}</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((log, displayIndex) => {
                  const isSelected = log.originalIndex === selectedIndex;
                  return (
                    <tr
                      key={log.uid}
                      data-display-index={displayIndex}
                      ref={isSelected ? selectedRowRef : null}
                      className={`${getLevelClass(log.level)}${isSelected ? " log-row-selected" : ""}${log.isPinned ? " log-row-pinned" : ""}`}
                      onClick={() => handleRowClick(log.originalIndex)}
                    >
                      <td className="log-col-time">{formatTimestamp(log.timestamp)}</td>
                      <td className={`log-col-source log-source-${log.source}`}>
                        {log.isPinned && (
                          <span className="log-pinned-indicator" title="Pinned (doesn't match filter)">
                            📌{" "}
                          </span>
                        )}
                        {log.source === "frontend" ? "FE" : "BE"}
                      </td>
                      <td className="log-col-level">{log.level.toUpperCase()}</td>
                      <td className="log-col-message">{renderMessage(log)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="log-viewer-footer">
          <span className="log-count">
            {t("LogCount")}: {displayLogs.length} / {logs.length}
            {selectedIndex !== null && ` • Selected: #${selectedIndex + 1}`}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
