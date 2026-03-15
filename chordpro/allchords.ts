import { UnicodeSymbol } from "../common/symbols";

export type ChordLayout = (number | null)[];
export type ChordLayouts = ChordLayout[];
export type ChordVariations = { [key: string]: ChordLayouts };

const allchordsDesc = `Name: Major chord
Symbols: M
Steps: 1-3-5

Name: Major 7th chord
Symbols: △, △7, maj, maj7, M7
Steps: 1-3-5-7

Name: Major 9th chord
Symbols: △9, maj9, M9, maj7(9)
Steps: 1-3-5-7-9

Name: Major 11th chord
Symbols: △11, maj11, M11
Steps: 1-3-5-7-9-11

Name: Major 9th 13 chord
Symbols: △9(13), maj7(6/9)
Steps: 1-3-5-7-9-13

Name: Major 13th chord
Symbols: △13, maj13, M13
Steps: 1-3-5-7-9-11-13

Name: Major 9 #11 chord
Symbols: △9(#11), maj9(#11), maj7(9,#11)
Steps: 1-3-5-7-9-#11

Name: Major 13 #11 chord
Symbols: △13(#11), maj13(#11), maj7(13,#11), maj9(#11,13)
Steps: 1-3-5-7-9-#11-13

Name: Major 6th chord
Symbols: 6, add6
Steps: 1-3-5-6

Name: Major add9 chord
Symbols: add9
Steps: 1-3-5-9

Name: Major 6add9 chord
Symbols: 6add9, add6/9, 6/9
Steps: 1-3-5-6-9

Name: Major 7 b5 chord
Symbols: △b5, △7(b5), maj7(b5)
Steps: 1-3-b5-7

Name: Major 7 #5 chord
Symbols: △#5, △7(#5), maj7(#5), maj7+, +7+5
Steps: 1-3-#5-7

Name: Minor chord
Symbols: m, min, -
Steps: 1-b3-5

Name: Minor 7th chord
Symbols: m7, min7, -7
Steps: 1-b3-5-b7

Name: Minor 9th chord
Symbols: m9, m7/9, min9, -9
Steps: 1-b3-5-b7-9

Name: Minor 11th chord
Symbols: m11, min11, -11
Steps: 1-b3-5-b7-9-11

Name: Minor 9th 13 chord
Symbols: m9/13, min9/13, -9/13
Steps: 1-b3-5-b7-9-13

Name: Minor 13th chord
Symbols: m13, min13, -13
Steps: 1-b3-5-b7-9-11-13

Name: Minor 6th chord
Symbols: m6, min6, madd6, m(add6), -6
Steps: 1-b3-5-6

Name: Minor add9 chord
Symbols: madd9, m(add9), m9(no 7th)
Steps: 1-b3-5-9

Name: Minor 6add9 chord
Symbols: m6add9, m6/9, min6/9, m(add6,9), -6/9
Steps: 1-b3-5-6-9

Name: Minor Major 7th chord
Symbols: m△, mmaj, mmaj7, min(maj7), -(maj7), mM7, m+7
Steps: 1-b3-5-7

Name: Minor Major 9th chord
Symbols: m△9, mmaj9, min(maj9), m9(maj7), mM9
Steps: 1-b3-5-7-9

Name: Half-diminished minor 7 chord
Symbols: ø, m7b5, m7-5, halfdim
Steps: 1-b3-b5-b7

Name: Minor 7 #5 chord
Symbols: m7#5, m7+
Steps: 1-b3-#5-b7

Name: Dominant 7th chord
Symbols: 7
Steps: 1-3-5-b7

Name: Dominant 9th chord
Symbols: 9, 7/9
Steps: 1-3-5-b7-9

Name: Dominant 11th chord
Symbols: 11, 9sus4
Steps: 1-3-5-b7-9-11

Name: Dominant 9th 13 chord
Symbols: 9(13)
Steps: 1-3-5-b7-9-13

Name: Dominant 13th chord
Symbols: 13
Steps: 1-3-5-b7-9-11-13

Name: Dominant 7th suspended 4th chord
Symbols: 7sus4, 7sus, 7/4, 4/7
Steps: 1-4-5-b7

Name: Dominant 7th b5
Symbols: 7b5, 7-5
Steps: 1-3-b5-b7

Name: Dominant 7th #5
Symbols: 7#5, 7maj5, 7+5
Steps: 1-3-#5-b7

Name: Dominant 7th b9
Symbols: 7b9, 7-9
Steps: 1-3-5-b7-b9

Name: Dominant 7th #9
Symbols: 7#9, 7+9, 7b10
Steps: 1-3-5-b7-#9

Name: Dominant 7th b5 b9
Symbols: 7(b5,b9), 7(-5,-9)
Steps: 1-3-b5-b7-b9

Name: Dominant 7th b5 #9
Symbols: 7(b5,#9), 7(-5,+9)
Steps: 1-3-b5-b7-#9

Name: Dominant 7th #5 b9
Symbols: 7(#5,b9), 7(+5,-9)
Steps: 1-3-#5-b7-b9

Name: Dominant 7th #5 #9
Symbols: 7(#5,#9), 7(+5,+9)
Steps: 1-3-#5-b7-#9

Name: Dominant 9th b5
Symbols: 9b5, 7(b5,9), 9-5
Steps: 1-3-b5-b7-9

Name: Dominant 9th #5
Symbols: 9#5, 7(#5,9), 9+5
Steps: 1-3-#5-b7-9

Name: Dominant 13th #11
Symbols: 13#11, 13+11, 7(9,#11,13)
Steps: 1-3-5-b7-9-#11-13

Name: Dominant 13th b9
Symbols: 13b9, 13-9
Steps: 1-3-5-b7-b9-11-13

Name: Dominant 7th add b9,13
Symbols: 7(b9,13)
Steps: 1-3-5-b7-b9-13

Name: Dominant 11th b9
Symbols: 11b9, 7sus4(b9)
Steps: 1-5-b7-b9-11

Name: Augmented triad
Symbols: +, aug
Steps: 1-3-#5

Name: Diminished triad
Symbols: dim
Steps: 1-b3-b5

Name: Diminished seventh chord
Symbols: o, °, dim7, o7, 7dim
Steps: 1-b3-b5-6(bb7)

Name: Power chord
Symbols: 5
Steps: 1-5

Name: Suspended 4th chord
Symbols: 4, sus, sus4
Steps: 1-4-5

Name: Suspended 2nd chord
Symbols: 2, sus2
Steps: 1-2-5

Name: Suspended 2nd 4th chord
Symbols: 4sus2, sus2sus4, 2sus4, 4/2, 2/4
Steps: 1-2-4-5

Name: Major diminished 5th chord
Symbols: -5
Steps: 1-3-b5`;

const majorScalePositions = [0, 2, 4, 5, 7, 9, 11];

function convertStringToSteps(s: string) {
  const steps: number[] = [];
  for (const field of s.split("-")) {
    const m = /([b#]?)([0-9]+).*/.exec(field);
    if (!m) throw new Error("Invalid chord step: " + field);
    const value = majorScalePositions[(parseInt(m[2]) + 6) % 7];
    const offset = m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0;
    steps.push(value + offset);
  }
  return steps;
}

export type ChordInfo = {
  name: string;
  symbols: string[];
  steps: number[];
  desc: string;
};

function isSubset(less: ChordInfo, more: ChordInfo) {
  for (const value of less.steps) if (more.steps.indexOf(value) < 0) return false;
  return true;
}

export const chordMap = new Map<string, ChordInfo>();

export function createChordInfo(desc: string, name: string, symbols: string[] = []) {
  const chordInfo: ChordInfo = {
    name,
    symbols: symbols.length === 1 && symbols[0] === "M" ? [""] : symbols,
    steps: convertStringToSteps(desc),
    desc,
  };
  return chordInfo;
}

export const allChordInfo = (() => {
  const chordInfos: ChordInfo[] = [];
  for (const block of allchordsDesc.replace("\r", "").split("\n\n")) {
    let name = "",
      symbols: string[] = [],
      desc = "";
    for (const l of block.split("\n")) {
      const line = l.trim();
      const m = /^([a-z]+):\s+(.*)$/gi.exec(line);
      if (m)
        switch (m[1]) {
          case "Name":
            name = m[2];
            break;
          case "Symbols":
            symbols = m[2].split(", ");
            break;
          case "Steps":
            desc = m[2];
            break;
          default:
            throw new Error("Invalid chord info line: " + line);
        }
      else throw new Error("Invalid chord info line: " + line);
    }
    const chordInfo = createChordInfo(desc, name, symbols);
    chordInfos.push(chordInfo);
    for (const symbol of chordInfo.symbols) {
      const prev = chordMap.get(symbol);
      if (!prev || isSubset(chordInfo, prev)) chordMap.set(symbol, chordInfo);
      else if (prev && !isSubset(prev, chordInfo))
        throw new Error("Ambiguity error between " + prev.name + " and " + chordInfo.name + " at " + symbol);
    }
  }
  return chordInfos;
})();

export const rxChordExtension = /(.*)\(([^)]+)\)$/;
export const all_modifiers: string[] = allChordInfo.map((x) => x.name);

const customChordVariants = new Map<string, ChordInfo>();

function decomposeSteps(stepsDesc: string, trimParenthesis: boolean = false) {
  let steps = new Map<number, { n: number; s: string }>();
  let needsReorder = false,
    prevStepNumber = 0;
  for (const s of stepsDesc.split("-")) {
    let n = s;
    if (trimParenthesis) n = n.replace(/\(.*\)/g, "");
    n = n.replace(/[^0-9]/g, "");
    const i = parseInt(n);
    if (steps.has(i) || isNaN(i) || i < 1 || i > 13 || i === 8 || i === 10 || i === 12) return null;
    steps.set(i, { n: i, s });
    if (prevStepNumber > i) needsReorder = true;
    prevStepNumber = i;
  }
  if (needsReorder) {
    const tmp = new Map<number, { n: number; s: string }>();
    const ta: number[] = [];
    steps.forEach((value, key) => ta.push(key));
    for (const key of ta.sort()) {
      const v = steps.get(key);
      if (v) tmp.set(key, v);
    }
    steps = tmp;
  }
  return steps;
}

export function stepsToModifier(steps: string, exactMatchOnly?: boolean) {
  const c = decomposeSteps(steps);
  if (!c) return null;

  let maxScore = 0,
    bestChord: ChordInfo | undefined;
  let maxNoMod = 0,
    bestNonModified: ChordInfo | undefined;
  for (const info of allChordInfo) {
    if (exactMatchOnly) {
      if (info.desc !== steps) continue;
      bestChord = info;
      break;
    }
    const d = decomposeSteps(info.desc, true);
    if (!d) continue;
    let score = 0;
    d.forEach((v, k) => {
      if (score >= 0) {
        const inc = c.get(k);
        if (!inc) score = -1;
        else if (inc.s === v.s) ++score;
      }
    });
    if (score > maxScore) {
      maxScore = score;
      bestChord = info;
    }
    if (!info.symbols[0].endsWith(")") && score > maxNoMod) {
      maxNoMod = score;
      bestNonModified = info;
    }
  }

  let modifier: string | null = null;
  if (bestChord) {
    if (bestChord.desc !== steps && bestNonModified) bestChord = bestNonModified;
    modifier = bestChord.symbols[0];
    let inited = false;
    const d = decomposeSteps(bestChord.desc, true);
    if (d)
      c.forEach((v, k) => {
        let step = "";
        const o = d.get(k);
        if (o?.s !== v.s) step = v.s;
        if (step) {
          if (!inited) {
            modifier += "(";
            inited = true;
          } else modifier += ",";
          modifier += step;
        }
      });
    if (inited) modifier += ")";
  }
  return modifier;
}

const rxRaise = new RegExp("#+" + UnicodeSymbol.sharp, "g");
const rxReduce = new RegExp("b-" + UnicodeSymbol.flat, "g");

export function findOrCreateChordVariant(modifier: string) {
  const match = rxChordExtension.exec(modifier);
  if (!match) return null;
  const baseChordInfo = chordMap.get(match[1].trim());
  if (!baseChordInfo) return null;

  try {
    const mstepvalue = (s: string) => s.replace(/[^0-9]/g, "");
    const steps = decomposeSteps(baseChordInfo.desc, true);
    if (!steps) throw Error("decomposeSteps failed on " + baseChordInfo.desc);
    for (const change of match[2].split(",")) {
      let s = change.replace(rxRaise, "#").replace(rxReduce, "b");
      const n = mstepvalue(s);
      if (s.startsWith(n)) s = s.substr(n.length) + n;
      const i = parseInt(n);
      if (isNaN(i) || i < 1 || i > 13 || i === 8 || i === 10 || i === 12) throw new Error("Invalid note modifier: " + s);
      steps.set(i, { n: i, s });
    }
    const stepList: { n: number; s: string }[] = [];
    steps.forEach((v) => stepList.push(v));
    stepList.sort((v1, v2) => v1.n - v2.n);
    const desc = stepList.map((x) => x.s).join("-");
    const cv = customChordVariants.get(desc) || createChordInfo(desc, "Custom " + baseChordInfo.name, [modifier]);
    chordMap.set(modifier, cv);
    return cv;
  } catch (e) {
    console.warn("Editor", "Error processing chord modifier", e);
  }
  return null;
}

function select<T>(source: T[], num: number, cb: (subset: T[]) => void | boolean) {
  const copy = new Array<T>(...source);
  for (let i = 0; i < copy.length; ++i) {
    const value = copy[i];
    copy.splice(i, 1);
    if (copy.length === num) {
      if (cb(copy)) break;
    } else select(copy, num, cb);
    copy.splice(i, 0, value);
  }
}

type PossibleNotePosition = {
  note: number;
  string: number;
  pos: number;
};

function differentNoteCount(pnp: (PossibleNotePosition | null)[]) {
  const differentNotes = new Set<number>();
  for (const p of pnp) if (p) differentNotes.add(p.note);
  return differentNotes.size;
}

function formatSteps(steps: number[]) {
  let res = "";
  for (const step of steps) res += step + "-";
  return res;
}

export type ChordLayoutOptions = {
  allowBassSeparation?: boolean;
};

export class ChordLayoutGenerator {
  public capo = 0;

  constructor(
    public readonly tuning: number[],
    private readonly options: ChordLayoutOptions = {}
  ) {}

  private isPlayable(pnp: (PossibleNotePosition | null)[], limit: number = 10000) {
    let barPos = 10000,
      on = -1,
      fingerCount = 0;
    for (let string = 0; string < pnp.length; ++string) {
      const np = pnp[string];
      if (np) {
        if (on === 0 && string < limit) return false;
        on = 1;
        if (np.pos > this.capo) {
          ++fingerCount;
          barPos = Math.min(barPos, np.pos);
        }
      } else if (on > 0) on = 0;
    }
    let barStarted: PossibleNotePosition | null = null,
      hadOpenStringSince = false,
      barLength = 0;
    if (fingerCount > 3)
      for (const np of pnp)
        if (np) {
          if (np.pos === barPos) {
            if (!barStarted) barStarted = np;
            else if (hadOpenStringSince) return false;
            else {
              --fingerCount;
              barLength = np.string - barStarted.string;
            }
          } else if (np.pos === this.capo && barStarted) hadOpenStringSince = true;
        }
    if (fingerCount > 4) return false;
    if (fingerCount > 1 && barLength >= 3 && hadOpenStringSince) return false;
    return true;
  }

  private extendWithBass(
    reqWBass: number,
    pnp: (PossibleNotePosition | null)[],
    pbn: PossibleNotePosition[] | null,
    cb: (pnp: (PossibleNotePosition | null)[]) => void
  ) {
    if (pbn === null) {
      if (this.isPlayable(pnp)) {
        cb(pnp);
        return true;
      }
      return false;
    }
    let lowest = 0,
      retval = false;
    for (let i = pnp.length - 1; i >= 0; --i)
      if (pnp[i]) {
        lowest = i;
        break;
      }
    for (let i = pbn.length - 1; i >= 0; --i) {
      const bp = pbn[i];
      if (bp.string === lowest || (lowest + 1 < pnp.length && bp.string === lowest + 1)) {
        const bassed = Array.from(pnp);
        bassed.splice(bp.string, 1, bp);
        if (differentNoteCount(bassed) === reqWBass && this.isPlayable(bassed, this.options.allowBassSeparation ? bp.string : this.tuning.length)) {
          cb(bassed);
          retval = true;
        }
      }
    }
    return retval;
  }

  private generateAllValidSubset(
    req: number,
    pnp: (PossibleNotePosition | null)[],
    pbn: PossibleNotePosition[] | null,
    cb: (pnp: (PossibleNotePosition | null)[]) => void
  ) {
    const differentNotes = new Set<number>();
    let usedStringCount = 0;
    for (const p of pnp)
      if (p) {
        differentNotes.add(p.note);
        ++usedStringCount;
      }
    if (differentNotes.size !== req) return;
    const reqWBass = differentNotes.size + (pbn && differentNotes.has(pbn[0].note) ? 0 : 1);
    this.extendWithBass(reqWBass, pnp, pbn, cb);
    const filtered = pnp.filter((x) => x !== null);
    for (let i = usedStringCount - 1; i >= req; --i)
      select(filtered, i, (c) => {
        const current: (PossibleNotePosition | null)[] = [];
        for (let string = 0; string < pnp.length; ++string) current[string] = null;
        for (const pos of c) if (pos) current[pos.string] = pos;
        if (differentNoteCount(current) === req) this.extendWithBass(reqWBass, current, pbn, cb);
      });
  }

  private generateAllVariations(
    req: number,
    pnps: PossibleNotePosition[][],
    pbn: PossibleNotePosition[] | null,
    cb: (pnp: (PossibleNotePosition | null)[]) => void,
    current: (PossibleNotePosition | null)[] = []
  ) {
    if (current.length < pnps.length) {
      const onstring = pnps[current.length];
      if (onstring.length === 0) {
        current.push(null);
        this.generateAllVariations(req, pnps, pbn, cb, current);
        current.pop();
      } else
        for (const pos of onstring) {
          current.push(pos);
          this.generateAllVariations(req, pnps, pbn, cb, current);
          current.pop();
        }
    } else this.generateAllValidSubset(req, current, pbn, cb);
  }

  private generatePossibleChords(baseNote: number, steps: number[], bassNote: number | null, maxWidth: number = 4): ChordLayouts {
    const requiredNotes = new Set<number>();
    const chordVariations: ChordLayouts = [];
    for (const note of steps) requiredNotes.add((baseNote + note) % 12);

    const alreadyHasSet = new Set<string>();

    for (let bund = this.capo; bund < 12; ++bund) {
      const pnps: PossibleNotePosition[][] = [];
      const pbn: PossibleNotePosition[] | null = bassNote ? [] : null;
      for (let string = 0; string < this.tuning.length; ++string) {
        const pnp: PossibleNotePosition[] = [];
        pnps.push(pnp);
        if (pbn && string >= this.tuning.length - 3 && (this.tuning[string] + this.capo) % 12 === bassNote)
          pbn.push({
            note: this.tuning[string] + this.capo,
            string,
            pos: this.capo,
          });
        for (let i = 0; i < maxWidth; ++i) {
          const note = (this.tuning[string] + bund + i) % 12;
          if (pbn && bund + i > this.capo && bassNote === note)
            pbn.push({
              note,
              string,
              pos: bund + i,
            });
          if (requiredNotes.has(note))
            pnp.push({
              note,
              string,
              pos: bund + i,
            });
        }
      }
      this.generateAllVariations(requiredNotes.size, pnps, pbn, (pnp) => {
        const chordVariation: ChordLayout = [];
        let signature = "",
          minBund = 100;
        for (const p of pnp) {
          const value = p ? p.pos : null;
          chordVariation.push(value);
          signature += value + ",";
          if (value !== null && minBund > value) minBund = value;
        }
        if ((bund === this.capo || minBund === bund) && !alreadyHasSet.has(signature)) {
          chordVariations.push(chordVariation);
          alreadyHasSet.add(signature);
        }
      });
    }
    return chordVariations;
  }

  genChordLayouts(baseNote: number, bassNote: number | null, chordInfo: ChordInfo, usedSteps?: Set<string>) {
    baseNote %= 12;
    if (bassNote) bassNote %= 12;

    let chordLayouts: ChordLayouts = [];
    if (!usedSteps) chordLayouts = this.generatePossibleChords(baseNote, chordInfo.steps, bassNote);
    else
      for (let i = 1; i < 4; ++i) {
        let found = false;
        select(chordInfo.steps, chordInfo.steps.length - i, (steps) => {
          if (steps[0] === 0) {
            const key = formatSteps(steps);
            if (!usedSteps.has(key)) {
              const v = this.generatePossibleChords(baseNote, steps, bassNote);
              if (v.length > 0) {
                found = true;
                chordLayouts.push(...v);
              }
              usedSteps.add(key);
            }
          }
        });
        if (found) break;
      }
    const powerChord = chordInfo.desc === "1-5";
    if (powerChord)
      chordLayouts = chordLayouts.filter((layout) => {
        let valid = false;
        for (let string = 4; !valid && string < this.tuning.length; ++string) {
          const pos = layout[string];
          valid = pos !== null && (this.tuning[string] + pos) % 12 === baseNote;
        }
        return valid;
      });
    const score = (layout: ChordLayout) => {
      const dampedStringValue = -100;
      const unusedStringValue = -50;
      const startBundValue = -500;
      const widthValue = -10;
      const usedBundsValue = -1000;
      const minStringValue = powerChord ? 0 : -10000;
      const lowestIsBassValue = 5000;
      const openStringValue = 100;

      let value = 0,
        minBund = 10000,
        maxBund = 0,
        minString = 0,
        lowestNote = 0,
        dampedCount = 0;
      const usedBunds = new Set<number>();
      for (let string = 0; string < this.tuning.length; ++string) {
        const pos = layout[string];
        if (pos === null) {
          if (minBund === 10000) {
            ++minString;
            value += unusedStringValue;
          } else ++dampedCount;
          continue;
        }
        if (dampedCount > 0) {
          value += dampedStringValue;
          dampedCount = 0;
        }
        if (pos === this.capo) value += openStringValue;
        else {
          usedBunds.add(pos);
          minBund = Math.min(minBund, pos);
          maxBund = Math.max(maxBund, pos);
        }
        lowestNote = this.tuning[string] + pos;
      }

      minBund -= this.capo;
      maxBund -= this.capo;
      if (dampedCount > 0) value += dampedCount * unusedStringValue;
      if (bassNote === null && lowestNote % 12 === baseNote % 12) value += lowestIsBassValue;
      value += (widthValue >= 0 ? 1 : -1) * Math.pow(Math.abs(widthValue), maxBund - minBund);
      value += minBund * startBundValue * (minBund > 4 ? 10 : 1);
      value += minString * minStringValue;
      value += usedBunds.size > 3 ? usedBundsValue : 0;

      return value;
    };
    const sortHelper = chordLayouts.map((x) => {
      return { layout: x, score: score(x) };
    });
    sortHelper.sort((x1, x2) => x2.score - x1.score);
    return sortHelper.map((x) => x.layout);
  }

  genAllChordVariationForKey(baseNote: number, bassNote: number | null) {
    const chordVariations: ChordVariations = {};
    const trySubset: ChordInfo[] = [];
    const usedSteps = new Set<string>();
    const store = (chordInfo: ChordInfo, layouts: ChordLayouts, simplified: boolean) => {
      usedSteps.add(formatSteps(chordInfo.steps));
      chordVariations[chordInfo.name + (simplified ? "*" : "")] = layouts;
    };
    for (const chordInfo of allChordInfo) {
      const layout = this.genChordLayouts(baseNote, bassNote, chordInfo);
      if (layout.length > 0) store(chordInfo, layout, false);
      else trySubset.push(chordInfo);
    }
    for (const chordInfo of trySubset) {
      const layout = this.genChordLayouts(baseNote, bassNote, chordInfo, usedSteps);
      if (layout.length > 0) store(chordInfo, layout, true);
      else console.debug("Editor", `No variation added for ${chordInfo.name} for note #${baseNote}`);
    }
    return chordVariations;
  }

  genAllChordsForGuitar(bassNote?: number) {
    const chords: ChordVariations[] = [];
    for (let baseNote = 0; baseNote < 12; ++baseNote)
      chords.push(this.genAllChordVariationForKey(baseNote, bassNote !== undefined ? bassNote : null));
    return chords;
  }

  getTotalChordLayoutTotalCount() {
    const count = (va: ChordVariations[]) => {
      let c = 0;
      for (const v of va) for (const key of Object.keys(v)) c += v[key].length;
      return c;
    };
    let cnt = count(this.genAllChordsForGuitar());
    for (let baseNote = 0; baseNote < 12; ++baseNote) cnt += count(this.genAllChordsForGuitar(baseNote));
    return cnt;
  }
}
