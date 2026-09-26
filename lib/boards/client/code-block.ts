import type { BoardObject, CodePayload } from "../types";

export function codeCopyButtonAt(object: BoardObject, x: number, y: number) {
  if (object.kind !== "code") return false;
  const payload = object.payload as CodePayload;
  return x >= payload.x + payload.width - 44 && x <= payload.x + payload.width
    && y >= payload.y && y <= payload.y + 48;
}
