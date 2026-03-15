import { all_modifiers, chordMap } from "./allchords";
import { ChordProDocument, getChordSystem } from "./chordpro_base";
import { NoteSystemCode } from "./note_system";

export function getJoinedMetaDataDirectives(sep: string) {
  return ChordProDocument.metaDataDirectives.join(sep);
}

export function getAllKnownChordTypeName(sep: string) {
  return all_modifiers.join(sep);
}

export function getAllKnownChordModifier(sep: string) {
  const list: string[] = [];
  chordMap.forEach((value, key) => {
    list.push(key);
    if (value.symbols.length) list.push(value.symbols[0]);
  });
  return list.join(sep);
}

export function getChordFindAndSplitPattern(systemCode: NoteSystemCode) {
  return getChordSystem(systemCode).chordFindAndSplitPattern;
}
