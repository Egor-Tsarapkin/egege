const THEMES = new Set(["dark", "light"]);
const ACCENTS = new Set(["lime", "blue", "red", "pink", "beige", "orange", "purple", "cyan", "yellow", "mint", "coral", "indigo", "violet", "teal", "matcha", "crimson", "deepPurple", "goldApex"]);
const REACTIONS = new Set(["xp", "hearts", "numbers", "fire", "fireworks", "random"]);
const SITE_STYLES = new Set(["base", "animals", "antique", "what", "brainstorm"]);

export function cleanSitePreferences(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!THEMES.has(String(candidate.theme)) || !ACCENTS.has(String(candidate.accent)) ||
      !REACTIONS.has(String(candidate.reaction)) || !SITE_STYLES.has(String(candidate.siteStyle)) ||
      typeof candidate.styleMotion !== "boolean" || typeof candidate.taskGifs !== "boolean") return null;
  return {
    theme: String(candidate.theme),
    accent: String(candidate.accent),
    reaction: String(candidate.reaction),
    siteStyle: String(candidate.siteStyle),
    styleMotion: candidate.styleMotion,
    taskGifs: candidate.taskGifs,
  };
}
