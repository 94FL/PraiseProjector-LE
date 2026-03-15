import { notPhraseFoundAdditionalCost } from "./pp-utils";
import { SongEntry, SongFound, SongFoundType } from "./pp-types";
import { DamerauLevenshtein, filterNonWordChars, isVowel, simplifyString } from "./stringTools";
import { MultiMap } from "./utils";

export class SongPos {
  songId: string;
  pos: number;
  cost: number;
  public constructor(p: SongPos | SongEntry, c: number) {
    const baseInit = !(p instanceof SongPos);
    this.songId = p.songId;
    this.pos = baseInit ? c : p.pos;
    this.cost = baseInit ? 0 : p.cost + c;
  }
}

export class MatchResult {
  readonly minCost: number;
  constructor(
    readonly positions: SongPos[],
    readonly version: number
  ) {
    let minCost = Number.MAX_VALUE;
    for (const pos of this.positions) {
      minCost = Math.min(minCost, pos.cost);
      if (minCost == 0) break;
    }
    this.minCost = minCost;
  }
}

function getWords(text: string): string[] {
  return filterNonWordChars(text).split(" ");
}

export class SongWords {
  private posMap = new MultiMap<string, SongPos>(); // songId -> SongPos
  private versionNumber = 0;
  private songHeaderLengths = new Map<string, number>(); // songId -> header length in chars

  static readonly nonTitlePosOffset = 100000;
  static readonly metaPosOffset = 1000000;

  get version() {
    return this.versionNumber;
  }

  add(song: SongEntry) {
    if (song.songdata) {
      let pos = 0;
      for (const word of getWords(song.title)) {
        const s = word.trim().toLocaleLowerCase();
        if (s) this.posMap.add(s, new SongPos(song, pos++));
      }
      pos = SongWords.nonTitlePosOffset;

      const metaValues: string[] = [];
      const lyricsOnly =
        song.songdata.text
          .replace(/\[[^\]]*\]|^[ \t]*#.*$|^[ \t]*{[^}]*}[ \t]*$/gm, (s) => {
            const trimmed = s.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
              const i = trimmed.indexOf(":");
              if (i >= 0 && !trimmed.startsWith("start_of_")) metaValues.push(trimmed.substring(i + 1, trimmed.length - 1).trim());
            }
            return "";
          })
          .replace(/[ \t]*{start_of_grid.*?{end_of_grid}[ \t]*/gs, "")
          .replace(/\n+/g, "\n")
          .trim() ?? "";

      const headerEnd = lyricsOnly.indexOf("\n");
      if (headerEnd >= 0) lyricsOnly.indexOf("\n", headerEnd + 1);
      if (headerEnd >= 0) this.songHeaderLengths.set(song.songId, headerEnd);

      for (const word of getWords(lyricsOnly)) this.posMap.add(word, new SongPos(song, pos++));

      pos = SongWords.metaPosOffset;
      for (const meta of metaValues) {
        for (const word of getWords(meta)) {
          const s = word.trim().toLocaleLowerCase();
          if (s) this.posMap.add(s, new SongPos(song, pos++));
        }
      }

      ++this.versionNumber;
    }
  }
  /*
      remove(song: SongEntry)
      {
          for(const word of getWords(song.title))
          {
              const s = word.trim();
              if (!s) this.posMap.remove(word, (p) => p.song === song);
          }
          for (const word of getWords(song))
              posMap.Remove(word, p => p.song == song);
          ++version;
      }
  */
  rebuild(songs: SongEntry[]) {
    this.posMap.clear();
    for (const song of songs) this.add(song);
  }

  private static readonly maxRecentListCount = 15;
  private recentWordMatches = new Map<string, MatchResult>();
  private recentWordUsage = new Set<string>();

  private matches(word: string, nullCostPrefix: boolean) {
    let rv: MatchResult | undefined = undefined;

    let searchWord = word;
    for (let i = 0; i < 2; ++i) {
      let mv = this.recentWordMatches.get(searchWord);
      if (mv) {
        if (mv.version !== this.versionNumber) {
          this.recentWordMatches.delete(searchWord);
          mv = undefined;
        }
        this.recentWordUsage.delete(searchWord);
      }

      if (!mv) {
        const ep: SongPos[] = [];
        this.posMap.forAllItems((key, value) => ep.push(new SongPos(value, DamerauLevenshtein.CalcDifferenceTo(word, key, i > 0))));
        this.recentWordMatches.set(searchWord, (mv = new MatchResult(ep, this.versionNumber)));
      }

      if (rv && rv.minCost <= mv.minCost) break;

      this.recentWordUsage.add(searchWord);
      if (this.recentWordUsage.size > SongWords.maxRecentListCount) {
        for (const key of Array.from(this.recentWordUsage.keys()).slice(0, this.recentWordUsage.size - SongWords.maxRecentListCount)) {
          this.recentWordUsage.delete(key);
          this.recentWordMatches.delete(key);
        }
      }

      rv = mv;

      if (!nullCostPrefix) break;
      searchWord += "\u0001";
    }

    return rv!;
  }

  aiMatches(word: string, nullCostPrefix: boolean) {
    return this.matches(word, nullCostPrefix).positions;
  }

  getWordCost(word: string, nullCostPrefix: boolean) {
    return this.matches(word, nullCostPrefix).minCost;
  }
  /*
    public SimpleMatches(word: string, ignoreCase = false) {
      return this.matches((w) => (string.Compare(w, word, ignoreCase) == 0 ? 0 : float.NaN));
    }
  */

  filterMatch(song: SongEntry, filters: WordMatch[]): { type: SongFoundType; cost: number } | undefined {
    let minCost = Number.MAX_VALUE;
    let startPos = -1;

    const fm = filters.length > 0 ? filters[0].getSongPositions(song) : null;
    if (fm != null) {
      fm.forEach((value, pos) => {
        let ec: number | undefined = value;

        for (let i = 1; i < filters.length; ++i) {
          const c = filters[i].getSongPositions(song)?.get(pos + i);
          if (c === undefined) {
            ec = undefined;
            break;
          }
          ec += c;
        }

        if (ec !== undefined && ec < minCost) {
          minCost = ec;
          startPos = pos;
        }
      });

      if (minCost < Number.MAX_VALUE) {
        if (startPos < SongWords.nonTitlePosOffset) return { type: "TITLE", cost: minCost };
        if (startPos > SongWords.metaPosOffset) return { type: "META", cost: minCost };
        const headerEnd = this.songHeaderLengths.get(song.songId);
        return headerEnd && startPos < SongWords.nonTitlePosOffset + headerEnd ? { type: "HEAD", cost: minCost } : { type: "LYRICS", cost: minCost };
      }
    }

    let titleCost = 0;
    let headCost = 0;
    let lyricsCost = 0;
    let metaCost = 0;

    for (const m of filters) {
      const sp = m.getSongPositions(song);
      if (sp == null) return undefined;

      let titleMinCost = Number.MAX_VALUE;
      let headMinCost = Number.MAX_VALUE;
      let lyricsMinCost = Number.MAX_VALUE;
      let metaMinCost = Number.MAX_VALUE;
      sp.forEach((costForPos, pos) => {
        if (pos < SongWords.nonTitlePosOffset) titleMinCost = Math.min(titleMinCost, costForPos);
        else if (pos > SongWords.metaPosOffset) metaMinCost = Math.min(metaMinCost, costForPos);
        else {
          const headerEnd = this.songHeaderLengths.get(song.songId);
          if (headerEnd && pos < SongWords.nonTitlePosOffset + headerEnd) headMinCost = Math.min(headMinCost, costForPos);
          else lyricsMinCost = Math.min(lyricsMinCost, costForPos);
        }
      });
      if (titleMinCost === Number.MAX_VALUE) titleCost = Number.MAX_SAFE_INTEGER;
      else titleCost += titleMinCost;
      if (headMinCost === Number.MAX_VALUE) headCost = Number.MAX_SAFE_INTEGER;
      else headCost += headMinCost;
      if (lyricsMinCost === Number.MAX_VALUE) lyricsCost = Number.MAX_SAFE_INTEGER;
      else lyricsMinCost += lyricsMinCost;
      if (metaMinCost === Number.MAX_VALUE) metaCost = Number.MAX_SAFE_INTEGER;
      else metaMinCost += metaMinCost;
    }

    if (titleCost < Number.MAX_SAFE_INTEGER) return { type: "TITLE", cost: titleCost + notPhraseFoundAdditionalCost };
    if (headCost < Number.MAX_SAFE_INTEGER) return { type: "HEAD", cost: headCost + notPhraseFoundAdditionalCost };
    if (lyricsCost < Number.MAX_SAFE_INTEGER) return { type: "LYRICS", cost: lyricsCost + notPhraseFoundAdditionalCost };
    if (metaCost < Number.MAX_SAFE_INTEGER) return { type: "META", cost: metaCost + notPhraseFoundAdditionalCost };

    return undefined;
  }

  filter(expr: string, songs: Iterable<SongEntry>) {
    const res: SongFound[] = [];
    if (expr) {
      const filter = new FilterData(expr);
      const filters = filter.matchesTo(this);
      for (const song of songs) {
        const found = this.filterMatch(song, filters);
        if (found) res.push({ ...song, found });
      }
      res.sort((a, b) => {
        const diff = a.found.cost - b.found.cost;
        return diff ? diff : a.title.localeCompare(b.title);
      });
      if (res.length > 0) {
        const minCost = res[0].found.cost;
        const limit = minCost > notPhraseFoundAdditionalCost ? 2 * minCost - notPhraseFoundAdditionalCost : 2 * minCost;
        let i = 1;
        while (i < res.length && i < 25 && res[i].found.cost <= limit) ++i;
        if (i < res.length) res.splice(i, res.length - i);
      }
    }
    return res;
  }
}

export class FilterData {
  readonly normalized: string;
  simplifiedStr = "";
  wordsAndLimits: { word: string; limit: number }[] = [];
  maxAllowedWordCosts: number[] = [];
  matches: WordMatch[] | null = null;
  songWordsVersion = 0;

  constructor(expr: string) {
    this.normalized = filterNonWordChars(expr.toLocaleLowerCase());
  }

  get simplified() {
    if (!this.simplifiedStr) this.simplifiedStr = simplifyString(this.normalized);
    return this.simplifiedStr;
  }

  matchesTo(songWords: SongWords) {
    if (this.matches == null || this.songWordsVersion !== songWords.version) {
      const filters: WordMatch[] = [];
      let i = 0;

      if (!this.wordsAndLimits) {
        this.wordsAndLimits = [];
        for (const word of this.simplified.split(" ")) {
          let limit = word.length > 5 ? 3 : word.length <= 3 ? 2 : Math.floor(word.length / 2) + 1;
          for (const ch of word) if (isVowel(ch)) limit += 0.1;
          this.wordsAndLimits.push({ word, limit });
        }
      }

      const l = this.wordsAndLimits.length;
      while (i < l) {
        const wordAndLimit = this.wordsAndLimits[i++];
        const m = new WordMatch(wordAndLimit.word);
        for (const sp of songWords.aiMatches(m.word, i == l)) m.add(sp.songId, sp.pos, sp.cost);
        if (!m.isEmpty) {
          m.filterPositions(wordAndLimit.limit);
          filters.push(m);
        }
      }
      this.songWordsVersion = songWords.version;
      this.matches = filters;
    }
    return this.matches;
  }
}

class WordMatch {
  positions = new Map<string, Map<number, number>>(); // songId -> { pos -> cost }

  constructor(readonly word: string) {}
  add(songId: string, pos: number, cost: number) {
    let d = this.positions.get(songId);
    if (!d) this.positions.set(songId, (d = new Map<number, number>()));
    d.set(pos, cost);
  }

  getSongPositions(song: SongEntry) {
    return this.positions.get(song.songId);
  }

  get isEmpty() {
    return this.positions.size === 0;
  }

  filterPositions(maxCost: number) {
    const ps = new Map<string, Map<number, number>>();
    this.positions.forEach((value, key) => {
      const filtered = new Map<number, number>();
      value.forEach((cost, pos) => {
        if (cost <= maxCost || (notPhraseFoundAdditionalCost <= cost && cost <= notPhraseFoundAdditionalCost + maxCost)) filtered.set(pos, cost);
      });
      if (filtered.size > 0) ps.set(key, filtered);
    });
    this.positions = ps;
  }
}
