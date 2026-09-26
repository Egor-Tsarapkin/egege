import Prism from "prismjs";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-pascal.js";
import type { CodePayload } from "../types";

// PyCharm's dark editor palette. Plain identifiers and punctuation stay neutral.
export const codePalette = {
  plain: "#bcbec4", keyword: "#cf8e6d", boolean: "#cf8e6d", number: "#2aacb8",
  builtin: "#8888c6", function: "#56a8f5", string: "#6aab73",
  comment: "#7a7e85", decorator: "#b3ae60",
};
export type CodeSegment = { text: string; color: string };
const cache = new Map<string, CodeSegment[][]>();

export function highlightCode(code: string, language: CodePayload["language"]): CodeSegment[][] {
  const key = `${language}\0${code}`;
  const cached = cache.get(key); if (cached) return cached;
  const grammar = Prism.languages[language === "cpp" ? "cpp" : language];
  const lines: CodeSegment[][] = [[]];
  function append(text: string, color: string) {
    text.split("\n").forEach((part, index) => {
      if (index) lines.push([]);
      if (!part) return;
      const line = lines[lines.length - 1]; const previous = line[line.length - 1];
      if (previous?.color === color) previous.text += part;
      else line.push({ text: part, color });
    });
  }
  function visit(token: string | Prism.Token, inherited: string = codePalette.plain) {
    if (typeof token === "string") { append(token, inherited); return; }
    const aliases = Array.isArray(token.alias) ? token.alias : token.alias ? [token.alias] : [];
    const kind = [token.type, ...aliases].find((type) => type in codePalette);
    const color = language === "python" && token.content === "print" && token.type === "keyword"
      ? codePalette.builtin : kind ? codePalette[kind as keyof typeof codePalette] : inherited;
    if (typeof token.content === "string") append(token.content, color);
    else if (Array.isArray(token.content)) token.content.forEach((child) => visit(child, color));
    else visit(token.content, color);
  }
  (grammar ? Prism.tokenize(code, grammar) : [code]).forEach((token) => visit(token));
  // Keep pan/zoom renders cheap without retaining every version of edited code.
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, lines);
  return lines;
}
