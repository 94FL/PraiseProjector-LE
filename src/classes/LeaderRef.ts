import { v4 as uuidv4 } from "uuid";

export class Leader {
  id: string;
  name: string;

  constructor(name: string, id: string | null = null) {
    this.id = id || uuidv4();
    this.name = name;
  }

  static fromJSON(data: any): Leader {
    if (data && data.name) {
      return new Leader(data.id || uuidv4(), data.name);
    }
    // Return a default/empty item if data is not in a recognized format
    return new Leader("unknown", "Invalid Leader");
  }
}
