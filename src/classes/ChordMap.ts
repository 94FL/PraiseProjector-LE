/**
 * Port of C# ChordMap class from SongImporterForm
 * Maps original chord notations to normalized forms
 */
export class ChordMap {
  private map: Map<string, string> = new Map();

  /**
   * Add or update a chord mapping
   */
  set(original: string, normalized: string): void {
    this.map.set(original, normalized);
  }

  /**
   * Get normalized form of a chord
   */
  get(original: string): string | undefined {
    return this.map.get(original);
  }

  /**
   * Get all original chords
   */
  getOriginals(): string[] {
    return Array.from(this.map.keys());
  }

  /**
   * Get all normalized chords
   */
  getNormalized(): string[] {
    return Array.from(this.map.values());
  }

  /**
   * Get count of mappings
   */
  get count(): number {
    return this.map.size;
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get all entries as array of [original, normalized] pairs
   */
  getEntries(): Array<[string, string]> {
    return Array.from(this.map.entries());
  }
}

/**
 * Chord normalization utilities
 */
export class ChordNormalizer {
  /**
   * Normalize chord: H -> B, apply lowercase moll option
   */
  static normalize(chord: string, useH: boolean, lcMoll: boolean): string {
    let normalized = chord.trim();

    // H -> B conversion (German to English notation)
    if (!useH) {
      normalized = normalized.replace(/\bH\b/g, "B");
      normalized = normalized.replace(/\bHm\b/g, "Bm");
      normalized = normalized.replace(/\bH([/#])/g, "B$1");
    }

    // Lowercase 'moll' conversion
    if (lcMoll) {
      // Convert 'Moll', 'MOLL', etc. to 'moll'
      normalized = normalized.replace(/\b[Mm][Oo][Ll][Ll]\b/g, "moll");
    }

    return normalized;
  }

  /**
   * Build chord map from a set of chords
   */
  static buildChordMap(chords: Set<string>, useH: boolean, lcMoll: boolean): ChordMap {
    const map = new ChordMap();

    for (const chord of chords) {
      const normalized = ChordNormalizer.normalize(chord, useH, lcMoll);
      map.set(chord, normalized);
    }

    return map;
  }

  /**
   * Quick test if a string could be a chord
   * Port of rxChordQuickTest regex from C#
   */
  static couldBeChord(text: string): boolean {
    // Pattern: ^([a-h0-9m/()-+](#|b|sz?|isz?)?(sus|add[0-9]+|maj|aug)?)+$
    const pattern = /^([a-h0-9m/()+-](#|b|sz?|isz?)?(sus|add[0-9]+|maj|aug)?)+$/i;
    return pattern.test(text);
  }

  /**
   * Count possible chords in a string (separated by whitespace)
   */
  static possibleChordCount(text: string): number {
    const parts = text.trim().split(/\s+/);
    let count = 0;

    for (const part of parts) {
      if (ChordNormalizer.couldBeChord(part)) {
        count++;
      }
    }

    return count;
  }
}
