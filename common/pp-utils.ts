import {
  Display,
  ErrorResponse,
  PlayList,
  PlaylistEntry,
  PreferenceType,
  SongEntry,
  SongFound,
  SongFoundType,
  SongPreferenceEntry,
} from "./pp-types";
import { log, logError } from "./pp-log";

export const notPhraseFoundAdditionalCost = 1000;

export function isErrorResponse(resp: unknown): resp is ErrorResponse {
  return resp != null && typeof resp === "object" && Object.prototype.hasOwnProperty.call(resp, "error");
}

/** Type guard for the electron-side wider SongFound. */
export function entryIsFound(entry: SongEntry): entry is SongFound {
  return !!(entry as SongFound).found;
}

export function compareFoundEntries(e1: SongEntry, e2: SongEntry): number {
  if (entryIsFound(e1) && entryIsFound(e2)) {
    const typeVal = (type: SongFoundType) => {
      switch (type) {
        case "NONE":
          return -1;
        case "TITLE":
          return 0;
        case "HEAD":
          return 1;
        case "LYRICS":
          return 2;
        case "META":
          return 3;
        case "WORDS":
          return 4;
      }
    };
    if (e1.found.type !== e2.found.type) return typeVal(e1.found.type) - typeVal(e2.found.type);
    const diff = e1.found.cost - e2.found.cost;
    if (diff) return diff;
  }
  return e1.title.localeCompare(e2.title);
}

const _emptyDisplay: Display = {
  song: "",
  system: "S",
  songId: "",
  from: 0,
  to: 0,
  transpose: 0,
};

export function getEmptyDisplay(): Display {
  return { ..._emptyDisplay };
}

export function parseDisplay(resp: string): Display | null {
  let match =
    /^[ ]*(?:#playlist:(.*)\n((?:.|[\r\n])*))?(?:#display_section:([-a-fA-F0-9]*)(@[-0-9]*)?(\|[0-9]+)?\/([0-9]+)-([0-9]+)\n((?:.|[\r\n])*))$/gm.exec(
      resp
    );
  if (!match) match = /^[ ]*#playlist:(.*)\n((?:.|[\r\n])*)$/gm.exec(resp);
  if (!match) return null;
  const display = getEmptyDisplay();
  display.playlist_id = match[1] || "";
  display.playlist = [];
  for (const line of (match[2] || "").split("\n")) {
    const entry = parseSongSetting(line);
    if (entry?.title) display.playlist.push({ ...entry, title: entry.title });
  }
  if (match.length > 3) {
    if (display.songId !== match[3]) {
      display.songId = match[3] || "";
      display.transpose = 0;
    }
    if (match[4]) display.transpose = parseInt(match[4].substring(1), 10);
    if (match[5]) display.capo = parseInt(match[5].substring(1), 10);
    if (match[6]) display.from = parseInt(match[6], 10);
    if (match[7]) display.to = parseInt(match[7], 10);
    if (match[8] && display.song !== match[8]) display.song = match[8] || "";
  } else {
    display.song = display.songId = "";
    display.from = display.to = display.transpose = display.capo = 0;
  }
  display.system = "G";
  return display;
}

/** Shallow-clone a Display, copying the playlist array reference. */
export function cloneDisplay(display: Display): Display {
  return { ...display, playlist: display.playlist ? [...display.playlist] : undefined };
}

/** Structural equality for Display objects (ignores playlist entry contents). */
export function compareDisplays(display1: Display, display2: Display): boolean {
  return (
    (display1.songId ?? "") === (display2.songId ?? "") &&
    (display1.song ?? "") === (display2.song ?? "") &&
    (display1.system ?? "") === (display2.system ?? "") &&
    (display1.from ?? 0) === (display2.from ?? 0) &&
    (display1.to ?? 0) === (display2.to ?? 0) &&
    (display1.transpose ?? 0) === (display2.transpose ?? 0) &&
    (display1.capo ?? -1) === (display2.capo ?? -1) &&
    (display1.instructions ?? "") === (display2.instructions ?? "") &&
    (display1.playlist_id ?? "") === (display2.playlist_id ?? "") &&
    (display1.message ?? "") === (display2.message ?? "") &&
    (display1.section ?? -1) === (display2.section ?? -1)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  parsing functions
// ═══════════════════════════════════════════════════════════════════════════════

function twodigit(n: number): string {
  let s = n.toString();
  while (s.length < 2) s = "0" + s;
  return s;
}

export function formatDateForLabel(scheduled: Date): string {
  return scheduled.getFullYear() + "." + twodigit(scheduled.getMonth() + 1) + "." + twodigit(scheduled.getDate());
}

export function parseLeaderProfile(data: string): { preferences: SongPreferenceEntry[]; playlists: PlayList[] } {
  const preferences: SongPreferenceEntry[] = [];
  const playlists: PlayList[] = [];
  let current_list: SongPreferenceEntry[] | PlaylistEntry[] = preferences;
  for (const l of data.split("\n")) {
    const line = l.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      let label = line.substr(1, line.length - 2).trim();
      const startTime = Date.parse(label.replace(/([0-9]+)\. *([0-9]+)\. *([0-9]+)/, "$1-$2-$3"));
      const scheduled = isNaN(startTime) ? undefined : new Date(startTime);
      if (scheduled) label = formatDateForLabel(scheduled);
      const songs: PlaylistEntry[] = [];
      playlists.push({ label, scheduled, songs });
      current_list = songs;
    } else {
      const setting = parseSongSetting(line);
      if (setting) (current_list as SongPreferenceEntry[]).push(setting);
    }
  }
  return { preferences, playlists };
}

export function parseSongSetting(s: string): SongPreferenceEntry | null {
  s = s.trim();
  if (!s) return null;

  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const p = JSON.parse(s);
      if (Object.prototype.hasOwnProperty.call(p, "songId")) return p as SongPreferenceEntry;
    } catch (error) {
      logError("JSON like profile string is not JSON", error);
    }
  }

  const match = /^([-a-fA-F0-9]+)(?:=([^@|:]*))?(?:@([-0-9]+))?(?:\|([0-9]+))?(?::(.*))?$/m.exec(s);
  if (!match) {
    log("Invalid profile entry string: " + s);
    return null;
  }
  const songId = match[1];
  const type = match[2] ? (match[2] as PreferenceType) : undefined;
  const transpose = parseInt(match[3] || "0", 10);
  const capo = match[4] ? parseInt(match[4], 10) : undefined;
  const title = match[5] ? match[5] : undefined;
  return { songId, transpose, capo, title, type };
}

export function verifyPlaylist(playlist: PlayList): void {
  if (playlist.scheduled) playlist.scheduled = new Date(playlist.scheduled as unknown as string);
  if (!playlist.label) playlist.label = playlist.scheduled ? formatDateForLabel(playlist.scheduled) : "";
}
