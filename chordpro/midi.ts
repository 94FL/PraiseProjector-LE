import * as MIDI from "midi.js";

export type Instrument = "" | "PIANO" | "GUITAR";
let initalized = false;

function initialize(onsuccess: () => void) {
  initalized = true;
  MIDI.loadPlugin({
    instruments: ["acoustic_grand_piano", "acoustic_guitar_nylon"],
    onsuccess: () => {
      MIDI.programChange(0, MIDI.GM.byName.acoustic_grand_piano.number);
      MIDI.programChange(1, MIDI.GM.byName.acoustic_guitar_nylon.number);
      for (let i = 2; i < MIDI.channels.length; ++i) MIDI.programChange(i, MIDI.GM.byName.acoustic_grand_piano.number);
      onsuccess();
    },
  });
}
export function playNote(instrument: Instrument, note: number, length: number = 1) {
  playChord(instrument, [note], length);
}

export function playChord(instrument: Instrument, chord: number[], length: number = 4) {
  const play = () => {
    const offset = 21 + 1 * 12;
    const midiChord = chord.map((x) => x + offset);
    if (instrument === "PIANO") {
      MIDI.chordOn(0, midiChord, 32, 0);
      MIDI.chordOff(0, midiChord, length);
    } else if (instrument === "GUITAR") {
      const delay = 0.02;
      let i = midiChord.length;
      for (const note of midiChord) {
        const d = --i * delay;
        MIDI.noteOn(1, note, 32, d);
        MIDI.noteOff(1, note, d + length);
      }
    } else return;
  };
  if (!initalized) initialize(play);
  else play();
}

export function playMidiFile(
  data: string,
  bpm: number,
  onError?: (error?: unknown) => void
): { stop: () => void; playing: boolean; currentTime: number; endTime: number } {
  const player = MIDI.Player;
  const play = () => {
    if (!isNaN(bpm)) player.BPM = bpm;
    player.loadFile(data, () => player.start(), null, onError);
  };
  if (!initalized) initialize(play);
  else play();
  return player;
}
