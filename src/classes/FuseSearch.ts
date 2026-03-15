import Fuse from "fuse.js";
import { Song } from "./Song";
import { StringExtensions } from "./StringExtensions";
import type { Settings } from "../types";

export interface SearchEngineResult {
  songId: string;
  reason: number;
  cost: number;
  snippet?: string;
}

const FR_TITLE = 1;
const FR_HEADER = 2;
const FR_LYRICS = 3;
const FR_META = 5;

const REASON_COST: Record<number, number> = {
  [FR_TITLE]: 0,
  [FR_HEADER]: 1000,
  [FR_LYRICS]: 2000,
  [FR_META]: 4000,
};

const FIELD_TO_REASON: Record<string, number> = {
  title: FR_TITLE,
  head: FR_HEADER,
  lyrics: FR_LYRICS,
  meta: FR_META,
};

interface FuseDocument {
  id: string;
  title: string;
  head: string;
  lyrics: string;
  meta: string;
}

export class FuseSearch {
  private fuse: Fuse<FuseDocument> | null = null;
  private documents: FuseDocument[] = [];
  private lastSettingsHash = "";

  private settingsHash(settings?: Settings | null): string {
    if (!settings) return "";
    return `${settings.fuseThreshold}|${settings.fuseMinMatchCharLength}|${settings.fuseUseExtendedSearch}`;
  }

  private createFuse(docs: FuseDocument[], settings?: Settings | null): Fuse<FuseDocument> {
    const threshold = settings?.fuseThreshold ?? 0.35;
    const minMatchCharLength = settings?.fuseMinMatchCharLength ?? 2;
    const useExtendedSearch = settings?.fuseUseExtendedSearch ?? false;

    return new Fuse(docs, {
      keys: [
        { name: "title", weight: 4 },
        { name: "head", weight: 3 },
        { name: "lyrics", weight: 2 },
        { name: "meta", weight: 1 },
      ],
      includeScore: true,
      includeMatches: true,
      threshold,
      ignoreLocation: true,
      useExtendedSearch,
      minMatchCharLength,
      getFn: (obj: FuseDocument, path: string | string[]) => {
        const key = Array.isArray(path) ? path[0] : path;
        const val = (obj as unknown as Record<string, string>)[key] ?? "";
        return StringExtensions.toUnaccented(val.toLowerCase());
      },
    });
  }

  addSong(song: Song) {
    const doc = this.songToDocument(song);
    const idx = this.documents.findIndex((d) => d.id === song.Id);
    if (idx >= 0) {
      this.documents[idx] = doc;
    } else {
      this.documents.push(doc);
    }
    this.fuse = null;
  }

  removeSong(song: Song) {
    const idx = this.documents.findIndex((d) => d.id === song.Id);
    if (idx >= 0) {
      this.documents.splice(idx, 1);
      this.fuse = null;
    }
  }

  rebuild(songs: Iterable<Song>) {
    this.documents = [];
    for (const song of songs) {
      this.documents.push(this.songToDocument(song));
    }
    this.fuse = null;
  }

  search(query: string, songs: Map<string, Song>, settings?: Settings | null, limit?: number): SearchEngineResult[] {
    if (!query.trim() || this.documents.length === 0) return [];

    // Rebuild Fuse index if settings changed
    const hash = this.settingsHash(settings);
    if (!this.fuse || hash !== this.lastSettingsHash) {
      this.fuse = this.createFuse(this.documents, settings);
      this.lastSettingsHash = hash;
    }

    const maxHits = limit || 200;
    const needle = StringExtensions.toUnaccented(query.toLowerCase());
    const results = this.fuse.search(needle, { limit: maxHits });

    const resultMap = new Map<string, SearchEngineResult>();

    for (let i = 0; i < results.length; i++) {
      const hit = results[i];
      const songId = hit.item.id;
      const song = songs.get(songId);
      if (!song) continue;

      // Collect Fuse match indices per field
      let bestReason = FR_LYRICS;
      const fieldIndices = new Map<string, Array<[number, number]>>();
      if (hit.matches) {
        for (const m of hit.matches) {
          const key = m.key ?? "";
          const reason = FIELD_TO_REASON[key] ?? FR_LYRICS;
          if (REASON_COST[reason] < REASON_COST[bestReason]) {
            bestReason = reason;
          }
          if (m.indices && m.indices.length > 0) {
            const existing = fieldIndices.get(key) ?? [];
            for (const [s, e] of m.indices) {
              existing.push([s, e + 1]); // Fuse indices are inclusive, convert to exclusive end
            }
            fieldIndices.set(key, existing);
          }
        }
      }

      const score = hit.score ?? 1;
      const cost = REASON_COST[bestReason] + score * 1000;

      const existingResult = resultMap.get(songId);
      if (!existingResult || cost < existingResult.cost) {
        let snippet: string | undefined;
        let snippetField: string | undefined;
        let snippetIndices: Array<[number, number]> | undefined;

        if (bestReason === FR_TITLE) {
          snippetField = song.Title;
          snippetIndices = fieldIndices.get("title");
        } else if (bestReason === FR_HEADER || fieldIndices.has("head")) {
          const firstNL = song.Lyrics.indexOf("\n");
          snippetField = firstNL >= 0 ? song.Lyrics.substring(0, firstNL) : song.Lyrics;
          snippetIndices = fieldIndices.get("head");
        } else if (bestReason === FR_LYRICS || fieldIndices.has("lyrics")) {
          snippetField = song.Lyrics;
          snippetIndices = fieldIndices.get("lyrics");
        } else if (bestReason === FR_META || fieldIndices.has("meta")) {
          const parts: string[] = [];
          for (const [k, v] of song.MetaData.entries()) {
            if (k.toLowerCase() !== "title") parts.push(`${k}: ${v}`);
          }
          snippetField = parts.join(" | ");
          snippetIndices = fieldIndices.get("meta");
        }

        if (snippetField && snippetIndices) {
          const html = this.buildHighlightHtml(snippetField, this.mergeRanges(snippetIndices));
          snippet = bestReason === FR_TITLE ? html : this.trimSnippet(html);
        } else if (snippetField) {
          snippet = this.generateSnippet(snippetField, query);
        }

        resultMap.set(songId, { songId, reason: bestReason, cost, snippet });
      }
    }

    return Array.from(resultMap.values()).sort((a, b) => {
      const cdiff = a.cost - b.cost;
      if (cdiff !== 0) return cdiff;
      const songA = songs.get(a.songId);
      const songB = songs.get(b.songId);
      return (songA?.Title ?? "").localeCompare(songB?.Title ?? "");
    });
  }

  private songToDocument(song: Song): FuseDocument {
    const lyrics = song.Lyrics;
    const firstNL = lyrics.indexOf("\n");
    const head = firstNL >= 0 ? lyrics.substring(0, firstNL) : lyrics;

    const metaParts: string[] = [];
    for (const [key, value] of song.MetaData.entries()) {
      if (key.toLowerCase() !== "title") {
        metaParts.push(`${key}: ${value}`);
      }
    }

    return {
      id: song.Id,
      title: song.Title,
      head,
      lyrics,
      meta: metaParts.join(" | "),
    };
  }

  /** Merge and sort overlapping [start, end) ranges. */
  private mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [sorted[0]!];
    for (let i = 1; i < sorted.length; i++) {
      const prev = merged[merged.length - 1]!;
      const curr = sorted[i]!;
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  /** Generate a snippet with highlights, trimmed around the first match. */
  private generateSnippet(text: string, query: string): string | undefined {
    if (!text || !query) return undefined;
    const ranges = this.findHighlightRanges(text, query);
    if (ranges.length === 0) return undefined;
    const html = this.buildHighlightHtml(text, ranges);
    return this.trimSnippet(html);
  }

  /** Find [start, end] ranges of words in text that match any query word (accent-insensitive, prefix). */
  private findHighlightRanges(text: string, query: string): Array<[number, number]> {
    const queryWords = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (queryWords.length === 0) return [];

    const unaccentedQueryWords = queryWords.map((w) => StringExtensions.toUnaccented(w));
    const wordRegex = /[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF]+/g;
    let m: RegExpExecArray | null;
    const highlights: Array<[number, number]> = [];

    while ((m = wordRegex.exec(text)) !== null) {
      const wordUnaccented = StringExtensions.toUnaccented(m[0].toLowerCase());
      for (const uq of unaccentedQueryWords) {
        if (wordUnaccented === uq || wordUnaccented.startsWith(uq)) {
          highlights.push([m.index, m.index + m[0].length]);
          break;
        }
      }
    }

    if (highlights.length === 0) return [];

    // Merge overlapping/adjacent ranges
    highlights.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [highlights[0]!];
    for (let i = 1; i < highlights.length; i++) {
      const prev = merged[merged.length - 1]!;
      const curr = highlights[i]!;
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  /** Build HTML string with <mark> tags from merged highlight ranges. */
  private buildHighlightHtml(text: string, ranges: Array<[number, number]>): string {
    let result = "";
    let pos = 0;
    for (const [start, end] of ranges) {
      result += this.escapeHtml(text.substring(pos, start));
      result += "<mark>" + this.escapeHtml(text.substring(start, end)) + "</mark>";
      pos = end;
    }
    result += this.escapeHtml(text.substring(pos));
    return result;
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private trimSnippet(html: string): string {
    const firstMark = html.indexOf("<mark>");
    const lastMarkEnd = html.lastIndexOf("</mark>");
    if (firstMark < 0 || lastMarkEnd < 0) return html;

    const prevNL = html.lastIndexOf("\n", firstMark);
    const nextNL = html.indexOf("\n", lastMarkEnd);

    let start = Math.max(0, firstMark - 25);
    let end = Math.min(html.length, lastMarkEnd + 7 + 32);

    if (prevNL >= 0 && prevNL > start) start = prevNL + 1;
    if (nextNL >= 0 && nextNL < end) end = nextNL;

    let snippet = html.substring(start, end).trim();
    if (start > 0) snippet = "\u2026" + snippet;
    if (end < html.length) snippet = snippet + "\u2026";

    return snippet;
  }
}
