/** Imported answers may contain literal escaped whitespace instead of line breaks. */
export function normalizeAnswer(value: string | string[] | undefined | null): string {
  const text = Array.isArray(value) ? value.join(" ") : value ?? "";
  return text.replace(/\\r\\n|\\[nrt]/g, " ").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, "");
}
