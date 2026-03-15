declare module "midi.js" {
  interface MidiPlayerState {
    playing: boolean;
    currentTime: number;
    endTime: number;
    BPM: number;
    stop(): void;
    loadFile(data: string, onSuccess: () => void, onProgress: unknown, onError?: (error?: unknown) => void): void;
    start(): void;
  }

  export const GM: {
    byName: Record<string, { number: number }>;
  };

  export const channels: unknown[];

  export const Player: MidiPlayerState;

  export function loadPlugin(options: Record<string, unknown>): void;
  export function programChange(channel: number, program: number): void;
  export function chordOn(channel: number, notes: number[], velocity: number, delay: number): void;
  export function chordOff(channel: number, notes: number[], delay: number): void;
  export function noteOn(channel: number, note: number, velocity: number, delay: number): void;
  export function noteOff(channel: number, note: number, delay: number): void;
}
