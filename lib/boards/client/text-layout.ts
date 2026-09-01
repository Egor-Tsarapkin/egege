export function wrapTextLines(text: string, maxWidth: number, measureWidth: (value: string) => number) {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) { result.push(""); continue; }
    let line = "";
    for (const symbol of Array.from(paragraph)) {
      if (!line || measureWidth(line + symbol) <= maxWidth) { line += symbol; continue; }
      let breakAt = -1;
      for (let index = line.length - 1; index >= 0; index -= 1) {
        if (/\s/.test(line[index])) { breakAt = index + 1; break; }
      }
      if (breakAt > 0) {
        result.push(line.slice(0, breakAt));
        line = line.slice(breakAt) + symbol;
      } else {
        result.push(line);
        line = symbol;
      }
    }
    result.push(line);
  }
  return result;
}
