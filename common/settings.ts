export class Settings {
  static default: Settings = new Settings();
  static current: Settings = Settings.default.clone();

  private clone(): Settings {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
  static reset() {
    this.current = this.default.clone();
  }
  static format() {
    return JSON.stringify(this.current);
  }
  static parse(data: string) {
    const parsed = JSON.parse(data);
    for (const key of Object.keys(JSON.parse(JSON.stringify(this.default)))) {
      const value = parsed[key];
      if (value !== undefined) (this.current as unknown as Record<string, unknown>)[key] = value;
    }
  }

  wordLevelDiff = true;
  keepScreenAwakeMinutes = 15;
  vowelExpandCost = 1;
  chordRevMoveCost = 5;
  chordFwdMoveCost = 10;
  moveChordsOnly = false;
  hostConnectTimeoutSeconds = 15;
}
