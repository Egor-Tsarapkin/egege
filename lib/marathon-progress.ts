export type MarathonAnswerState = "correct" | "wrong";

export type MarathonProgress = {
  answered: Record<string, MarathonAnswerState>;
  favorites: string[];
  marathonOrder: string[];
  autoAdvance: boolean;
  successEffect: boolean;
  updatedAt?: number;
};

const QUESTION_ID = /^(?:ege|python|py)-\d{3}$/;

export function cleanMarathonProgress(value: unknown): MarathonProgress | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!candidate.answered || typeof candidate.answered !== "object" ||
      !Array.isArray(candidate.favorites) || !Array.isArray(candidate.marathonOrder) ||
      typeof candidate.autoAdvance !== "boolean" || typeof candidate.successEffect !== "boolean") return null;

  const answeredEntries = Object.entries(candidate.answered as Record<string, unknown>);
  if (answeredEntries.length > 700 || answeredEntries.some(([id, state]) =>
    !QUESTION_ID.test(id) || (state !== "correct" && state !== "wrong"))) return null;
  const favorites = candidate.favorites.filter((id): id is string => typeof id === "string" && QUESTION_ID.test(id));
  const marathonOrder = candidate.marathonOrder.filter((id): id is string => typeof id === "string" && QUESTION_ID.test(id));
  if (favorites.length !== candidate.favorites.length || marathonOrder.length !== candidate.marathonOrder.length ||
      favorites.length > 700 || marathonOrder.length > 700) return null;

  if (candidate.updatedAt !== undefined && (typeof candidate.updatedAt !== "number" || !Number.isFinite(candidate.updatedAt) || candidate.updatedAt < 0)) return null;

  return {
    ...(typeof candidate.updatedAt === "number" ? { updatedAt: candidate.updatedAt } : {}),
    answered: Object.fromEntries(answeredEntries) as Record<string, MarathonAnswerState>,
    favorites: [...new Set(favorites)],
    marathonOrder: [...new Set(marathonOrder)],
    autoAdvance: candidate.autoAdvance,
    successEffect: candidate.successEffect,
  };
}

export function restoreMarathonProgress(local: MarathonProgress, remote: MarathonProgress | null): MarathonProgress {
  if (!remote) return local;
  if (local.updatedAt && remote.updatedAt) return local.updatedAt >= remote.updatedAt ? local : remote;
  // Older saved documents lack timestamps: keep answers from both copies.
  return {
    ...remote, ...local,
    answered: { ...remote.answered, ...local.answered },
    favorites: [...new Set([...remote.favorites, ...local.favorites])],
    marathonOrder: local.marathonOrder.length ? local.marathonOrder : remote.marathonOrder,
  };
}
