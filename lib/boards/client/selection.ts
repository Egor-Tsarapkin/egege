import type { BoardBounds, BoardObject, ImagePayload, LinePayload, ShapePayload, StrokePayload, TextPayload, CodePayload, TaskPayload, FilePayload } from "../types";

export type SelectionHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "line-start" | "line-end";

export type SelectionHandlePoint = { handle: SelectionHandle; x: number; y: number };

export function selectionAfterToolChange(selectedId: string, nextTool: string) {
  return nextTool === "select" ? selectedId : "";
}

export function selectionHandles(object: BoardObject): SelectionHandlePoint[] {
  if (object.kind === "stroke") return [];
  if (object.kind === "line" || object.kind === "arrow") {
    const payload = object.payload as LinePayload;
    return [
      { handle: "line-start", x: payload.startX, y: payload.startY },
      { handle: "line-end", x: payload.endX, y: payload.endY },
    ];
  }
  const centerX = (object.minX + object.maxX) / 2;
  const centerY = (object.minY + object.maxY) / 2;
  return [
    { handle: "nw", x: object.minX, y: object.minY },
    { handle: "n", x: centerX, y: object.minY },
    { handle: "ne", x: object.maxX, y: object.minY },
    { handle: "e", x: object.maxX, y: centerY },
    { handle: "se", x: object.maxX, y: object.maxY },
    { handle: "s", x: centerX, y: object.maxY },
    { handle: "sw", x: object.minX, y: object.maxY },
    { handle: "w", x: object.minX, y: centerY },
  ];
}

export function hitSelectionHandle(object: BoardObject, x: number, y: number, zoom: number) {
  const radius = 11 / Math.max(zoom, 0.05);
  return selectionHandles(object).find((point) => Math.hypot(x - point.x, y - point.y) <= radius)?.handle ?? null;
}

function pointToSegmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax; const dy = by - ay; const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(x - ax, y - ay);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

function polylineHit(points: Array<{ x: number; y: number }>, x: number, y: number, tolerance: number, closed = false) {
  if (points.length === 1) return Math.hypot(x - points[0].x, y - points[0].y) <= tolerance;
  const count = closed ? points.length + 1 : points.length;
  for (let index = 1; index < count; index += 1) {
    const start = points[(index - 1) % points.length]; const end = points[index % points.length];
    if (pointToSegmentDistance(x, y, start.x, start.y, end.x, end.y) <= tolerance) return true;
  }
  return false;
}

function segmentIntersectsBounds(start: { x: number; y: number }, end: { x: number; y: number }, bounds: BoardBounds, padding = 0) {
  const minX = bounds.minX - padding; const minY = bounds.minY - padding; const maxX = bounds.maxX + padding; const maxY = bounds.maxY + padding;
  const dx = end.x - start.x; const dy = end.y - start.y;
  let entry = 0; let exit = 1;
  const p = [-dx, dx, -dy, dy]; const q = [start.x - minX, maxX - start.x, start.y - minY, maxY - start.y];
  for (let index = 0; index < 4; index += 1) {
    if (Math.abs(p[index]) < 1e-9) { if (q[index] < 0) return false; continue; }
    const ratio = q[index] / p[index];
    if (p[index] < 0) entry = Math.max(entry, ratio); else exit = Math.min(exit, ratio);
    if (entry > exit) return false;
  }
  return true;
}

function polylineIntersectsBounds(points: Array<{ x: number; y: number }>, bounds: BoardBounds, padding = 0, closed = false) {
  if (points.length === 1) return points[0].x >= bounds.minX - padding && points[0].x <= bounds.maxX + padding && points[0].y >= bounds.minY - padding && points[0].y <= bounds.maxY + padding;
  const count = closed ? points.length + 1 : points.length;
  for (let index = 1; index < count; index += 1) {
    if (segmentIntersectsBounds(points[(index - 1) % points.length], points[index % points.length], bounds, padding)) return true;
  }
  return false;
}

function shapeOutlinePoints(object: BoardObject) {
  const payload = object.payload as ShapePayload;
  if (object.kind === "rectangle") return [
    { x: payload.x, y: payload.y }, { x: payload.x + payload.width, y: payload.y },
    { x: payload.x + payload.width, y: payload.y + payload.height }, { x: payload.x, y: payload.y + payload.height },
  ];
  const centerX = payload.x + payload.width / 2; const centerY = payload.y + payload.height / 2;
  if (object.kind === "star") return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5; const radius = index % 2 === 0 ? 1 : .45;
    return { x: centerX + Math.cos(angle) * payload.width / 2 * radius, y: centerY + Math.sin(angle) * payload.height / 2 * radius };
  });
  return Array.from({ length: 72 }, (_, index) => {
    const angle = index * Math.PI * 2 / 72;
    return { x: centerX + Math.cos(angle) * payload.width / 2, y: centerY + Math.sin(angle) * payload.height / 2 };
  });
}

/** Matches visible geometry instead of treating every object as a filled bounding box. */
export function objectHitTest(object: BoardObject, x: number, y: number, zoom: number) {
  const outlineTolerance = 1 / Math.max(.05, zoom);
  const strokeGrabTolerance = 3 / Math.max(.05, zoom);
  const hitTolerance = object.kind === "stroke" ? strokeGrabTolerance : outlineTolerance;
  if (x < object.minX - hitTolerance || x > object.maxX + hitTolerance || y < object.minY - hitTolerance || y > object.maxY + hitTolerance) return false;
  if (object.kind === "stroke") {
    const payload = object.payload as StrokePayload;
    return polylineHit(payload.points, x, y, strokeGrabTolerance + payload.size / 2);
  }
  if (object.kind === "line" || object.kind === "arrow") {
    const payload = object.payload as LinePayload;
    return pointToSegmentDistance(x, y, payload.startX, payload.startY, payload.endX, payload.endY) <= outlineTolerance + payload.strokeWidth / 2;
  }
  if (object.kind === "rectangle") {
    const payload = object.payload as ShapePayload; const tolerance = outlineTolerance + payload.strokeWidth / 2;
    return polylineHit(shapeOutlinePoints(object), x, y, tolerance, true);
  }
  if (object.kind === "ellipse") {
    const payload = object.payload as ShapePayload; const radiusX = Math.max(.001, payload.width / 2); const radiusY = Math.max(.001, payload.height / 2);
    const normalizedRadius = Math.hypot((x - payload.x - radiusX) / radiusX, (y - payload.y - radiusY) / radiusY);
    const normalizedTolerance = (outlineTolerance + payload.strokeWidth / 2) / Math.max(.001, Math.min(radiusX, radiusY));
    return Math.abs(normalizedRadius - 1) <= normalizedTolerance;
  }
  if (object.kind === "star") {
    const payload = object.payload as ShapePayload;
    return polylineHit(shapeOutlinePoints(object), x, y, outlineTolerance + payload.strokeWidth / 2, true);
  }
  return true;
}

/** A drag-selection box must touch the actual visible path, not just its loose outer bounds. */
export function objectIntersectsSelectionBox(object: BoardObject, bounds: BoardBounds) {
  if (object.maxX < bounds.minX || object.minX > bounds.maxX || object.maxY < bounds.minY || object.minY > bounds.maxY) return false;
  if (object.kind === "stroke") {
    const payload = object.payload as StrokePayload;
    return polylineIntersectsBounds(payload.points, bounds, payload.size / 2);
  }
  if (object.kind === "line" || object.kind === "arrow") {
    const payload = object.payload as LinePayload;
    return segmentIntersectsBounds({ x: payload.startX, y: payload.startY }, { x: payload.endX, y: payload.endY }, bounds, payload.strokeWidth / 2);
  }
  if (object.kind === "rectangle" || object.kind === "ellipse" || object.kind === "star") {
    const payload = object.payload as ShapePayload;
    return polylineIntersectsBounds(shapeOutlinePoints(object), bounds, payload.strokeWidth / 2, true);
  }
  return true;
}

export function resizeFromHandle(object: BoardObject, x: number, y: number, handle: SelectionHandle, preserveAspectRatio = false): BoardObject {
  const next = structuredClone(object);
  const now = Math.floor(Date.now() / 1000);

  if (next.kind === "line" || next.kind === "arrow") {
    const payload = next.payload as LinePayload;
    if (handle === "line-start") { payload.startX = x; payload.startY = y; }
    if (handle === "line-end") { payload.endX = x; payload.endY = y; }
    const padding = payload.strokeWidth;
    next.minX = Math.min(payload.startX, payload.endX) - padding;
    next.minY = Math.min(payload.startY, payload.endY) - padding;
    next.maxX = Math.max(payload.startX, payload.endX) + padding;
    next.maxY = Math.max(payload.startY, payload.endY) + padding;
    next.updatedAt = now;
    return next;
  }

  const minimumWidth = object.kind === "task" ? 320 : 24;
  const minimumHeight = object.kind === "task" ? 180 : 24;
  let minX = object.minX; let minY = object.minY; let maxX = object.maxX; let maxY = object.maxY;
  if (handle.includes("w")) minX = Math.min(x, maxX - minimumWidth);
  if (handle.includes("e")) maxX = Math.max(x, minX + minimumWidth);
  if (handle.includes("n")) minY = Math.min(y, maxY - minimumHeight);
  if (handle.includes("s")) maxY = Math.max(y, minY + minimumHeight);
  if (next.kind === "image" && preserveAspectRatio) {
    const ratio = Math.max(.001, (object.maxX - object.minX) / Math.max(.001, object.maxY - object.minY));
    if ((handle.includes("n") || handle.includes("s")) && (handle.includes("e") || handle.includes("w"))) {
      const rawWidth = maxX - minX; const rawHeight = maxY - minY;
      const width = Math.max(24, rawWidth / (object.maxX - object.minX) >= rawHeight / (object.maxY - object.minY) ? rawWidth : rawHeight * ratio);
      const height = width / ratio;
      if (handle.includes("w")) minX = maxX - width; else maxX = minX + width;
      if (handle.includes("n")) minY = maxY - height; else maxY = minY + height;
    } else if (handle === "e" || handle === "w") {
      const centerY = (object.minY + object.maxY) / 2; const height = (maxX - minX) / ratio;
      minY = centerY - height / 2; maxY = centerY + height / 2;
    } else if (handle === "n" || handle === "s") {
      const centerX = (object.minX + object.maxX) / 2; const width = (maxY - minY) * ratio;
      minX = centerX - width / 2; maxX = centerX + width / 2;
    }
  }
  next.minX = minX; next.minY = minY; next.maxX = maxX; next.maxY = maxY; next.updatedAt = now;

  if (next.kind === "rectangle" || next.kind === "ellipse" || next.kind === "star") {
    const payload = next.payload as ShapePayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY;
  } else if (next.kind === "text") {
    const payload = next.payload as TextPayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY; payload.autoWidth = false;
  } else if (next.kind === "code") {
    const payload = next.payload as CodePayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY;
  } else if (next.kind === "image") {
    const payload = next.payload as ImagePayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY;
  } else if (next.kind === "task") {
    const payload = next.payload as TaskPayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY;
  } else if (next.kind === "file") {
    const payload = next.payload as FilePayload;
    payload.x = minX; payload.y = minY; payload.width = maxX - minX; payload.height = maxY - minY;
  }
  return next;
}
