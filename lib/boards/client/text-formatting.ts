import type { TextPayload } from "../types";

export function shiftTextFormats(previous: string, next: string, formats: NonNullable<TextPayload["formats"]>) {
  let prefix = 0; while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1;
  let suffix = 0; while (suffix < previous.length - prefix && suffix < next.length - prefix && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix += 1;
  const removedEnd = previous.length - suffix; const insertedEnd = next.length - suffix; const delta = insertedEnd - removedEnd;
  return formats.flatMap((format) => {
    if (format.end <= prefix) return [format];
    if (format.start > removedEnd) return [{ ...format, start: format.start + delta, end: format.end + delta }];
    const start = Math.min(format.start, prefix); const end = Math.max(start, Math.min(next.length, format.end + delta));
    return end > start ? [{ ...format, start, end }] : [];
  });
}
