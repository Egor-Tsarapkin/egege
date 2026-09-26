const DAY_MS = 24 * 60 * 60 * 1000;

function previousDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day) - DAY_MS);
  return date.toISOString().slice(0, 10);
}

export function streakSummary(dateKeys: Iterable<string>, todayKey: string) {
  const active = new Set(Array.from(dateKeys).filter(Boolean));
  const todayActive = active.has(todayKey);
  let currentStreak = 0;
  let cursor = todayActive ? todayKey : previousDateKey(todayKey);

  while (active.has(cursor)) {
    currentStreak += 1;
    cursor = previousDateKey(cursor);
  }

  let longestStreak = 0;
  let run = 0;
  let previous = "";
  for (const key of Array.from(active).sort()) {
    run = previous && previousDateKey(key) === previous ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = key;
  }

  return { currentStreak, longestStreak, todayActive };
}
