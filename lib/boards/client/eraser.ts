import type { BoardObject, StrokePayload } from "../types";

export type EraserMode = "area" | "stroke" | "object";

export function eraserCanHit(object: BoardObject, mode: EraserMode) {
  return mode === "object" || object.kind === "stroke";
}

function pointToSegmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax; const dy = by - ay; const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(x - ax, y - ay);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

export function eraserHitsObject(object: BoardObject, x: number, y: number, radius: number) {
  if (object.kind !== "stroke") {
    const nearestX = Math.max(object.minX, Math.min(x, object.maxX));
    const nearestY = Math.max(object.minY, Math.min(y, object.maxY));
    return Math.hypot(x - nearestX, y - nearestY) <= radius;
  }
  const payload = object.payload as StrokePayload;
  const threshold = radius + payload.size / 2;
  for (let index = 1; index < payload.points.length; index += 1) {
    const a = payload.points[index - 1]; const b = payload.points[index];
    if (pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y) <= threshold) return true;
  }
  return false;
}

export function eraserPointHitsPath(point: { x: number; y: number }, path: Array<{ x: number; y: number }>, radius: number) {
  if (path.length === 1) return Math.hypot(point.x - path[0].x, point.y - path[0].y) <= radius;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1]; const b = path[index];
    if (pointToSegmentDistance(point.x, point.y, a.x, a.y, b.x, b.y) <= radius) return true;
  }
  return false;
}
