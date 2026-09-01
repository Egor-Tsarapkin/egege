import type { BoardBounds, BoardObject } from "../types";

export type AlignmentGuides = { x?: number; y?: number };

function anchors(min: number, max: number) {
  return [min, (min + max) / 2, max];
}

function closestAdjustment(source: number[], targets: number[], threshold: number) {
  let best: { delta: number; guide: number } | null = null;
  for (const from of source) for (const to of targets) {
    const delta = to - from;
    if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, guide: to };
  }
  return best;
}

export function snapBounds(moving: BoardBounds, references: BoardObject[], threshold: number) {
  const eligible = references.filter((object) => object.kind === "image" || object.kind === "text" || object.kind === "task");
  const x = closestAdjustment(anchors(moving.minX, moving.maxX), eligible.flatMap((object) => anchors(object.minX, object.maxX)), threshold);
  const y = closestAdjustment(anchors(moving.minY, moving.maxY), eligible.flatMap((object) => anchors(object.minY, object.maxY)), threshold);
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guides: { x: x?.guide, y: y?.guide } satisfies AlignmentGuides };
}
