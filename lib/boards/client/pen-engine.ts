import { getStroke } from "perfect-freehand";
import type { StrokePoint } from "../types";

export type PenSample = { x: number; y: number; pressure: number; time: number; pointerType: string };

export class PenEngine {
  private points: StrokePoint[] = [];
  private smoothPressure = 0.5;
  private smoothVelocity = 0;

  begin(sample: PenSample) {
    this.points = [];
    this.smoothPressure = sample.pointerType === "pen" ? Math.max(0.08, sample.pressure || 0.08) : 0.5;
    this.smoothVelocity = 0;
    return this.add(sample);
  }

  add(sample: PenSample, zoom = 1) {
    return this.append(sample, zoom);
  }

  private append(sample: PenSample, zoom: number) {
    const previous = this.points.at(-1);
    const dt = previous ? Math.max(1, sample.time - previous.time) : 1;
    const distance = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y) : 0;
    const velocity = distance * zoom / dt;
    this.smoothVelocity = this.smoothVelocity * 0.72 + velocity * 0.28;
    if (sample.pointerType === "pen") {
      const rawPressure = Math.max(0.04, Math.min(1, sample.pressure || this.smoothPressure));
      this.smoothPressure = this.smoothPressure * 0.62 + rawPressure * 0.38;
      const speedSignal = 1 - Math.min(1, this.smoothVelocity / 1.8);
      this.smoothPressure = Math.max(0.04, Math.min(1, this.smoothPressure * 0.84 + speedSignal * 0.16));
    } else {
      this.smoothPressure = 0.5;
    }
    const point = { x: sample.x, y: sample.y, pressure: this.smoothPressure, time: Math.round(sample.time) };
    if (this.points.length < 20_000 && (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) * zoom >= 0.2)) this.points.push(point);
    return point;
  }

  value() { return this.points; }
}

/** Midpoint quadratic curves have a continuous tangent, even with sparse mouse events. */
export function smoothStrokePoints(points: StrokePoint[], size: number): number[][] {
  if (points.length < 3) return points.map((point) => [point.x, point.y, point.pressure]);
  const result = [[points[0].x, points[0].y, points[0].pressure]];
  let start = result[0];
  for (let i = 1; i < points.length; i += 1) {
    const control = points[i]; const next = points[Math.min(i + 1, points.length - 1)];
    const end = [(control.x + next.x) / 2, (control.y + next.y) / 2, (control.pressure + next.pressure) / 2];
    const length = Math.hypot(control.x - start[0], control.y - start[1]) + Math.hypot(end[0] - control.x, end[1] - control.y);
    const steps = Math.max(2, Math.min(24, Math.floor(60_000 / points.length), Math.ceil(length / Math.max(.5, size * .4))));
    for (let j = 1; j <= steps; j += 1) {
      const t = j / steps; const u = 1 - t;
      result.push([u * u * start[0] + 2 * u * t * control.x + t * t * end[0], u * u * start[1] + 2 * u * t * control.y + t * t * end[1], u * u * start[2] + 2 * u * t * control.pressure + t * t * end[2]]);
    }
    start = end;
  }
  return result;
}

export function strokeOutline(points: StrokePoint[], size: number) {
  if (!points.length) return [];
  return getStroke(smoothStrokePoints(points, size), {
    size,
    thinning: 0.72,
    smoothing: 0.72,
    streamline: 0,
    simulatePressure: false,
    easing: (pressure) => pressure,
    start: { cap: true, taper: Math.min(size * 0.18, 2.5), easing: (value) => value },
    end: { cap: true, taper: Math.min(size * 0.28, 3.5), easing: (value) => value },
  });
}

/** Reuses the exact calculated geometry while a stroke's point array is unchanged. */
export class StrokeOutlineCache {
  private cache = new WeakMap<StrokePoint[], Map<number, number[][]>>();

  get(points: StrokePoint[], size: number) {
    let sizes = this.cache.get(points);
    if (!sizes) { sizes = new Map(); this.cache.set(points, sizes); }
    let outline = sizes.get(size);
    if (!outline) { outline = strokeOutline(points, size); sizes.set(size, outline); }
    return outline;
  }
}

/** Caches the browser-specific render object derived from the unchanged exact outline. */
export class StrokeRenderCache<T = unknown> {
  private readonly outlines = new StrokeOutlineCache();
  private readonly rendered = new WeakMap<number[][], T>();

  get(points: StrokePoint[], size: number, create: (outline: number[][]) => T) {
    const outline = this.outlines.get(points, size);
    let value = this.rendered.get(outline);
    if (value === undefined) { value = create(outline); this.rendered.set(outline, value); }
    return value;
  }
}

export function outlinePath(points: number[][]) {
  const path = new Path2D();
  if (!points.length) return path;
  const [firstX, firstY] = points[0];
  path.moveTo(firstX, firstY);
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    path.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  path.closePath();
  return path;
}
