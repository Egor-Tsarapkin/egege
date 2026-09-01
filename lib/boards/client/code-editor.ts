export function indentationAfterEnter(value: string, selectionStart: number, language: string) {
  const beforeCursor = value.slice(0, selectionStart);
  const currentLine = beforeCursor.slice(beforeCursor.lastIndexOf("\n") + 1);
  const leadingWhitespace = currentLine.match(/^\s*/)?.[0] ?? "";
  const opensBlock = language === "python"
    ? /:\s*(?:#.*)?$/.test(currentLine)
    : /\{\s*(?:\/\/.*)?$/.test(currentLine);
  return `\n${leadingWhitespace}${opensBlock ? "    " : ""}`;
}
