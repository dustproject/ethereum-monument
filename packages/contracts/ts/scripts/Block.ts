import type { ReadonlyVec3 } from "@dust/world/internal";

export interface Block {
  coord: ReadonlyVec3;
  id: number;
  orientation: number;
}
