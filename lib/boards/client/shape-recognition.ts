export type ShapePoint = { x: number; y: number };
export type RecognizedShape =
  | { kind: "line"; startX: number; startY: number; endX: number; endY: number }
  | { kind: "rectangle" | "ellipse"; x: number; y: number; width: number; height: number };

function distance(a: ShapePoint, b: ShapePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToLine(point: ShapePoint, start: ShapePoint, end: ShapePoint) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function recognizeHeldStroke(points: ShapePoint[]): RecognizedShape | null {
  if (points.length < 6) return null;
  const sampled = points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 80)) === 0);
  const first = sampled[0]; const last = sampled.at(-1)!;
  const xs = sampled.map((point) => point.x); const ys = sampled.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = maxX - minX; const height = maxY - minY; const diagonal = Math.hypot(width, height);
  if (diagonal < 24) return null;

  const endpointDistance = distance(first, last);
  const lineDeviation = Math.max(...sampled.map((point) => distanceToLine(point, first, last)));
  if (endpointDistance > diagonal * .82 && lineDeviation <= Math.max(5, diagonal * .075)) {
    return { kind: "line", startX: first.x, startY: first.y, endX: last.x, endY: last.y };
  }

  if (width < 20 || height < 20 || endpointDistance > Math.max(36, diagonal * .34)) return null;
  const edgeTolerance = Math.max(7, Math.min(width, height) * .16);
  const edgeRatio = sampled.filter((point) => Math.min(point.x - minX, maxX - point.x, point.y - minY, maxY - point.y) <= edgeTolerance).length / sampled.length;
  const corners = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
  const visitsCorners = corners.every(([x, y]) => Math.min(...sampled.map((point) => Math.hypot(point.x - x, point.y - y))) <= diagonal * .12);
  if (edgeRatio >= .62 && visitsCorners) return { kind: "rectangle", x: minX, y: minY, width, height };

  const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
  const radii = sampled.map((point) => Math.hypot((point.x - centerX) / (width / 2), (point.y - centerY) / (height / 2)));
  const meanError = radii.reduce((sum, radius) => sum + Math.abs(radius - 1), 0) / radii.length;
  if (meanError <= .24) return { kind: "ellipse", x: minX, y: minY, width, height };
  return null;
}

export function resizeRecognizedShape(shape: RecognizedShape, anchor: ShapePoint, current: ShapePoint): RecognizedShape {
  if (shape.kind === "line") return { ...shape, endX: current.x, endY: current.y };
  const centerX = shape.x + shape.width / 2; const centerY = shape.y + shape.height / 2;
  const initialRadius = Math.max(1, Math.hypot(anchor.x - centerX, anchor.y - centerY));
  const nextRadius = Math.max(4, Math.hypot(current.x - centerX, current.y - centerY));
  const scale = Math.max(.08, nextRadius / initialRadius);
  const width = shape.width * scale; const height = shape.height * scale;
  return { ...shape, x: centerX - width / 2, y: centerY - height / 2, width, height };
}
