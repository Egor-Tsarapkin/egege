import type { StrokePoint } from "./types";

const MAGIC = [0x45, 0x42, 0x53, 0x31] as const; // EBS1
const COORDINATE_SCALE = 16;
const MAX_POINTS = 20_000;

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`Invalid stroke ${label}`);
}

function writeVarUint(target: number[], value: number) {
  let remaining = Math.max(0, Math.floor(value));
  while (remaining >= 0x80) {
    target.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  target.push(remaining);
}

function readVarUint(bytes: Uint8Array, cursor: { value: number }) {
  let result = 0;
  let multiplier = 1;
  for (let index = 0; index < 5; index += 1) {
    if (cursor.value >= bytes.length) throw new Error("Truncated stroke data");
    const byte = bytes[cursor.value++];
    result += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) return result;
    multiplier *= 128;
  }
  throw new Error("Invalid stroke varint");
}

function zigZagEncode(value: number) {
  const integer = Math.trunc(value);
  return integer >= 0 ? integer * 2 : (-integer * 2) - 1;
}

function zigZagDecode(value: number) {
  return value % 2 === 0 ? value / 2 : -((value + 1) / 2);
}

function quantize(value: number) {
  assertFinite(value, "coordinate");
  const result = Math.round(value * COORDINATE_SCALE);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 160_000_000) {
    throw new Error("Stroke coordinate is outside the supported range");
  }
  return result;
}

export function encodeStrokePoints(points: readonly StrokePoint[]) {
  if (points.length < 1 || points.length > MAX_POINTS) {
    throw new Error(`Stroke must contain between 1 and ${MAX_POINTS} points`);
  }

  const bytes: number[] = [...MAGIC];
  writeVarUint(bytes, points.length);
  let previousX = 0;
  let previousY = 0;
  let previousTime = Math.max(0, Math.round(points[0].time));

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const x = quantize(point.x);
    const y = quantize(point.y);
    assertFinite(point.pressure, "pressure");
    assertFinite(point.time, "timestamp");

    writeVarUint(bytes, zigZagEncode(x - previousX));
    writeVarUint(bytes, zigZagEncode(y - previousY));
    bytes.push(Math.round(Math.min(1, Math.max(0, point.pressure)) * 255));
    const time = Math.max(previousTime, Math.round(point.time));
    writeVarUint(bytes, index === 0 ? 0 : Math.min(60_000, time - previousTime));
    previousX = x;
    previousY = y;
    previousTime = time;
  }

  return Uint8Array.from(bytes);
}

export function decodeStrokePoints(input: Uint8Array | ArrayBuffer) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < MAGIC.length + 1 || !MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error("Unsupported stroke format");
  }

  const cursor = { value: MAGIC.length };
  const count = readVarUint(bytes, cursor);
  if (count < 1 || count > MAX_POINTS) throw new Error("Invalid stroke point count");

  const points: StrokePoint[] = [];
  let x = 0;
  let y = 0;
  let time = 0;
  for (let index = 0; index < count; index += 1) {
    x += zigZagDecode(readVarUint(bytes, cursor));
    y += zigZagDecode(readVarUint(bytes, cursor));
    if (cursor.value >= bytes.length) throw new Error("Truncated stroke pressure");
    const pressure = bytes[cursor.value++] / 255;
    time += readVarUint(bytes, cursor);
    points.push({
      x: x / COORDINATE_SCALE,
      y: y / COORDINATE_SCALE,
      pressure,
      time,
    });
  }

  if (cursor.value !== bytes.length) throw new Error("Unexpected trailing stroke data");
  return points;
}

export function strokeBounds(points: readonly StrokePoint[], padding = 0) {
  if (!points.length) throw new Error("Cannot calculate bounds of an empty stroke");
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX: Math.floor(minX - padding),
    minY: Math.floor(minY - padding),
    maxX: Math.ceil(maxX + padding),
    maxY: Math.ceil(maxY + padding),
  };
}
