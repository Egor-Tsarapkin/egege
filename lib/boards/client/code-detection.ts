import type { CodeLanguage } from "../types";

export type CodeDetection = { isCode: boolean; language: CodeLanguage; confidence: number };

export function detectCode(value: string): CodeDetection {
  const text = value.trim();
  if (text.length < 8 || !text.includes("\n")) return { isCode: false, language: "python", confidence: 0 };
  const scores: Record<CodeLanguage, number> = { python: 0, cpp: 0, javascript: 0, pascal: 0 };
  if (/\b(def|elif|range|print|input|len|True|False|None)\b|:\s*(?:#.*)?$/m.test(text)) scores.python += 4;
  if (/^\s*(for|while|if|def|class)\b.*:\s*$/m.test(text)) scores.python += 3;
  if (/\b(#include|std::|cout|cin|vector|int main)\b/.test(text)) scores.cpp += 6;
  if (/\b(const|let|var|function|console\.log|document\.|=>)\b/.test(text)) scores.javascript += 5;
  if (/\b(begin|end\.|writeln|readln|program|integer|boolean)\b/i.test(text)) scores.pascal += 6;
  if (/[{};]/.test(text)) { scores.cpp += 1; scores.javascript += 1; }
  if (/^\s{2,}\S/m.test(text)) scores.python += 1;
  const genericScore = (/\b[a-zA-Z_]\w*\s*=\s*[^=]/.test(text) ? 1 : 0)
    + ((text.match(/[+*/%]|==|!=|<=|>=/g)?.length ?? 0) >= 2 ? 1 : 0)
    + (/\b[a-zA-Z_]\w*\([^)]*\)/.test(text) ? 1 : 0);
  if (genericScore) for (const language of Object.keys(scores) as CodeLanguage[]) scores[language] += genericScore;
  const [language, score] = (Object.entries(scores) as Array<[CodeLanguage, number]>).sort((a, b) => b[1] - a[1])[0];
  const confidence = Math.min(1, score / 7);
  return { isCode: score >= 3, language, confidence };
}
