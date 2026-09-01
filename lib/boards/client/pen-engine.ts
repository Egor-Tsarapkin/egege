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

  add(sample: PenSample) {
    const previous = this.points.at(-1);
    const dt = previous ? Math.max(1, sample.time - previous.time) : 1;
    const distance = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y) : 0;
    const velocity = distance / dt;
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
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.2) this.points.push(point);
    return point;
  }

  value() { return this.points; }
}

export function strokeOutline(points: StrokePoint[], size: number) {
  if (!points.length) return [];
  return getStroke(points.map((point) => [point.x, point.y, point.pressure]), {
    size,
    thinning: 0.72,
    smoothing: 0.62,
    streamline: 0.34,
    simulatePressure: false,
    easing: (pressure) => pressure,
    start: { cap: true, taper: Math.min(size * 0.18, 2.5), easing: (value) => value },
    end: { cap: true, taper: Math.min(size * 0.28, 3.5), easing: (value) => value },
  });
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
