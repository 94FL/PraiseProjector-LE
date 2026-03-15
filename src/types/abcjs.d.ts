declare module "abcjs" {
  export interface AbcVisualParams {
    add_classes?: boolean;
    responsive?: "resize" | boolean;
    paddingleft?: number;
    paddingright?: number;
    staffwidth?: number;
  }

  export function renderAbc(
    elementIdOrElement: string | HTMLElement,
    abc: string,
    params?: AbcVisualParams,
    engraverParams?: Record<string, unknown>
  ): unknown;

  export function strTranspose(note: string, semitones: number, mode?: unknown): string;

  export const synth: unknown;
}
