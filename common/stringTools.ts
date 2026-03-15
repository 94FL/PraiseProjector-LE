const baseVowels = [
  "a",
  "á",
  "à",
  "â",
  "ä",
  "ã",
  "å",
  "ă",
  "ą",
  "æ",
  "e",
  "é",
  "è",
  "ê",
  "ë",
  "ę",
  "i",
  "í",
  "ì",
  "î",
  "ï",
  "ı",
  "o",
  "ó",
  "ò",
  "ô",
  "ö",
  "õ",
  "ő",
  "ø",
  "œ",
  "u",
  "ú",
  "ù",
  "û",
  "ü",
  "ű",
  "ũ",
  "ů",
  "y",
  "ý",
  "ỳ",
  "ŷ",
  "ÿ",
];

const vowelSet = new Set<string>([...baseVowels, ...baseVowels.map((ch) => ch.toUpperCase())]);

export const knownVowelChars = Array.from(vowelSet).join("");

export function removeDiacretics(value: string): string {
  if (!value) {
    return "";
  }
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function simplifyString(value: string): string {
  if (!value) {
    return "";
  }
  const unaccented = removeDiacretics(value).toLowerCase();
  return unaccented.replace(/[^a-z0-9]+/g, " ").trim();
}

export type WordChunk = {
  text: string;
  word?: boolean;
  mid?: boolean;
  blank?: boolean;
  end?: boolean;
  unaccented?: string;
};

const WORD_CHAR_REGEX = /[A-Za-z0-9'\u00C0-\u024F]/u;

function splitWordAtVowels(word: string, splitByVowels: boolean): WordChunk[] {
  const unaccented = removeDiacretics(word);
  if (!splitByVowels || word.length <= 1) {
    return [{ text: word, word: true, unaccented }];
  }

  const chunks: WordChunk[] = [];
  let start = 0;
  for (let i = 1; i < word.length; ++i) {
    const prev = unaccented[i - 1];
    const current = unaccented[i];
    if (prev && current && isVowel(prev) && !isVowel(current)) {
      const slice = word.slice(start, i);
      chunks.push({ text: slice, word: true, unaccented: removeDiacretics(slice) });
      start = i;
    }
  }
  if (start < word.length) {
    const slice = word.slice(start);
    chunks.push({ text: slice, word: true, unaccented: removeDiacretics(slice) });
  }
  if (!chunks.length) {
    chunks.push({ text: word, word: true, unaccented });
  }
  chunks.forEach((chunk, index) => {
    chunk.mid = index > 0;
    chunk.end = index === chunks.length - 1;
  });
  return chunks;
}

export function splitTextToWords(value: string, options?: { appendPunctuation?: boolean; splitByVowels?: boolean }): WordChunk[] {
  const chunks: WordChunk[] = [];
  if (!value) {
    return chunks;
  }

  const appendPunctuation = options?.appendPunctuation ?? false;
  const splitByVowels = options?.splitByVowels ?? false;

  let index = 0;
  let pendingWordChunks: WordChunk[] | null = null;

  const flushPendingWord = () => {
    if (!pendingWordChunks) return;
    pendingWordChunks.forEach((chunk, idx) => {
      chunk.mid = idx > 0;
      chunk.end = idx === pendingWordChunks!.length - 1;
      chunks.push(chunk);
    });
    pendingWordChunks = null;
  };

  while (index < value.length) {
    const char = value[index];
    if (/\s/.test(char)) {
      const start = index;
      while (index < value.length && /\s/.test(value[index])) ++index;
      flushPendingWord();
      chunks.push({ text: value.slice(start, index), blank: true, end: true });
      continue;
    }

    let end = index;
    while (end < value.length && !/\s/.test(value[end])) ++end;
    const token = value.slice(index, end);
    index = end;

    const wordMatch = token.match(/^[A-Za-z0-9'\u00C0-\u024F]+/u);
    if (wordMatch) {
      const wordPart = wordMatch[0];
      const trailing = token.slice(wordPart.length);
      const wordChunks = splitWordAtVowels(wordPart, splitByVowels);
      if (pendingWordChunks) {
        pendingWordChunks[pendingWordChunks.length - 1].end = false;
      } else {
        pendingWordChunks = [];
      }
      pendingWordChunks.push(...wordChunks);

      if (trailing) {
        if (appendPunctuation && pendingWordChunks.length) {
          const last = pendingWordChunks[pendingWordChunks.length - 1];
          last.text += trailing;
          last.unaccented = (last.unaccented ?? "") + removeDiacretics(trailing);
        } else {
          flushPendingWord();
          chunks.push({ text: trailing, end: true });
        }
      }
      continue;
    }

    flushPendingWord();
    if (appendPunctuation && chunks.length) {
      const last = chunks[chunks.length - 1];
      if (!last.blank) {
        last.text += token;
        last.unaccented = (last.unaccented ?? "") + removeDiacretics(token);
        continue;
      }
    }
    const isWordLike = token.split("").some((c) => WORD_CHAR_REGEX.test(c));
    chunks.push({ text: token, word: isWordLike || undefined, end: true, unaccented: removeDiacretics(token) });
  }

  flushPendingWord();

  return chunks;
}

const syllableRegex = new RegExp(
  `[^${knownVowelChars}]*[${knownVowelChars}]+(?:[^${knownVowelChars}]*$|[^${knownVowelChars}](?=[^${knownVowelChars}]))?`,
  "g"
);

export function syllabify(word: string, unaccented?: string) {
  if (unaccented == null) unaccented = removeDiacretics(word).toLocaleLowerCase();
  let offset = 0;
  return (
    unaccented.match(syllableRegex)?.map((x) => {
      const start = offset;
      offset += x.length;
      return word.substring(start, offset);
    }) ?? [word]
  );
}

export function isVowel(char: string): boolean {
  if (!char) {
    return false;
  }
  return vowelSet.has(char) || vowelSet.has(char.toLowerCase());
}

export function filterNonWordChars(s: string, keepNumbers?: boolean) {
  return keepNumbers
    ? s.replace(/[^0-9a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]+/g, " ")
    : s.replace(/[^a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]+/g, " ");
}

export type PatternMachingMode = "FULL" | "PREFIX" | "SUBSTR" | "SUFFIX";

export class DamerauLevenshtein {
  static readonly invariants = new Map<string, string>();
  static readonly charDiffLookupMap = new Map<number, number>();

  private static GetUnaccentedChar(ch: string) {
    const rv = this.invariants.get(ch);
    if (rv) return rv;

    const s = removeDiacretics(ch);
    if (s.length > 1) console.log("Char {" + s + "} is more than one character length.");
    this.invariants.set(ch, s);
    return s;
  }

  private static GetCharDifference(ch1: string, ch2: string) {
    return DamerauLevenshtein.GetUnaccentedChar(ch1) === DamerauLevenshtein.GetUnaccentedChar(ch2) ? 0.1 : 1.0;
  }

  private static dlBuff = new Array<number>(101 * 101);

  public static CalcDistance<T>(string1: T[], string2: T[], chardiff: (c1: T, c2: T) => number, mode?: PatternMachingMode): number;
  public static CalcDistance(string1: string, string2: string, chardiff: (c1: string, c2: string) => number, mode?: PatternMachingMode): number;
  public static CalcDistance<T>(
    string1: T[] | string,
    string2: T[] | string,
    chardiff: (c1: T | string, c2: T | string) => number,
    mode: PatternMachingMode = "FULL"
  ) {
    if (!string1) return !string2 ? 0 : string2.length;
    if (!string2) return string1.length;

    const length1 = Math.min(string1.length, 100);
    const length2 = Math.min(string2.length, 100);

    for (let i = 0; i <= length1; ++i) DamerauLevenshtein.dlBuff[101 * i + 0] = i;
    for (let i = 0; i <= length2; ++i) DamerauLevenshtein.dlBuff[i] = mode === "SUBSTR" || mode === "SUFFIX" ? 0 : i;

    for (let i = 1; i <= length1; ++i) {
      for (let j = 1; j <= length2; ++j) {
        const cost = string1[i - 1] != string2[j - 1] ? chardiff(string1[i - 1], string2[j - 1]) : 0;

        const del = DamerauLevenshtein.dlBuff[101 * (i - 1) + j] + 1;
        const ins = DamerauLevenshtein.dlBuff[101 * i + j - 1] + 1;
        const sub = DamerauLevenshtein.dlBuff[101 * (i - 1) + j - 1] + cost;

        DamerauLevenshtein.dlBuff[101 * i + j] = Math.min(del, Math.min(ins, sub));

        if (i > 1 && j > 1 && string1[i - 1] == string2[j - 2] && string1[i - 2] == string2[j - 1]) {
          DamerauLevenshtein.dlBuff[101 * i + j] = Math.min(
            DamerauLevenshtein.dlBuff[101 * i + j],
            DamerauLevenshtein.dlBuff[101 * (i - 2) + j - 2] + cost
          );
        }
      }
    }

    if (mode === "PREFIX" || mode === "SUBSTR") {
      let minValue = Number.MAX_VALUE;
      for (let j = 1; j <= length2; ++j) minValue = Math.min(minValue, DamerauLevenshtein.dlBuff[length1 * 101 + j]);
      return minValue;
    }

    return DamerauLevenshtein.dlBuff[length1 * 101 + length2];
  }

  public static CalcAccentedDistance(string1: string, string2: string, mode: PatternMachingMode = "FULL") {
    return DamerauLevenshtein.CalcDistance(string1, string2, DamerauLevenshtein.GetCharDifference, mode);
  }

  public static CalcDifferenceTo(text: string, targetString: string, bAcceptPrefixWithLowerCost: boolean) {
    const f = DamerauLevenshtein.CalcAccentedDistance(text, targetString);
    if (bAcceptPrefixWithLowerCost) {
      const tl = targetString.length,
        sl = text.length;
      if (tl > sl && tl - sl == Math.floor(f)) {
        if (targetString.startsWith(text)) return 0.01 * f;
        if (removeDiacretics(targetString).startsWith(removeDiacretics(text))) return 0.1 * f;
      }
    }
    return f;
  }
}
