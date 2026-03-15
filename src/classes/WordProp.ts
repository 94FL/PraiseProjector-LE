import { v4 as uuidv4 } from "uuid";

export class WordProp {
  public text: string = "";
  public pos: number[] = [];

  public get WordPos(): number {
    const firstPos = this.pos[0];
    return firstPos !== undefined ? firstPos : Infinity;
  }
}
