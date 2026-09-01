const WINDOW_MS = 1_000;
const CURSOR_INTERVAL_MS = 24;
const HARD_MESSAGE_LIMIT = 240;
const WARNING_INTERVAL_MS = 2_000;

export function createRateState(now = Date.now()) {
  return { at: now, count: 0, cursorAt: Number.NEGATIVE_INFINITY, warnedAt: Number.NEGATIVE_INFINITY };
}

export function classifyRealtimeMessage(state, type, now = Date.now()) {
  if (now - state.at >= WINDOW_MS) {
    state.at = now;
    state.count = 0;
  }

  state.count += 1;
  if (state.count > HARD_MESSAGE_LIMIT) {
    if (now - state.warnedAt >= WARNING_INTERVAL_MS) {
      state.warnedAt = now;
      return "warn";
    }
    return "drop";
  }

  if (type === "cursor") {
    if (now - state.cursorAt < CURSOR_INTERVAL_MS) return "drop";
    state.cursorAt = now;
  }

  return "accept";
}
