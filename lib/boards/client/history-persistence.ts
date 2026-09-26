import type { BoardObject } from "../types";

export type BoardHistoryRecord =
  | { kind: "create"; object: BoardObject }
  | { kind: "update"; before: BoardObject; after: BoardObject }
  | { kind: "delete"; object: BoardObject };

export type StoredBoardHistory = { undo: BoardHistoryRecord[]; redo: BoardHistoryRecord[] };
const DB_NAME = "egege-board-history-v1";
const STORE = "histories";
const HISTORY_LIMIT = 40;

export function limitBoardHistory(history: StoredBoardHistory): StoredBoardHistory {
  return { undo: history.undo.slice(-HISTORY_LIMIT), redo: history.redo.slice(-HISTORY_LIMIT) };
}

function openHistory() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadBoardHistory(boardId: string, clientId: string): Promise<StoredBoardHistory> {
  const db = await openHistory();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(`${boardId}:${clientId}`);
    request.onsuccess = () => {
      const value = request.result as { undo?: BoardHistoryRecord[]; redo?: BoardHistoryRecord[] } | undefined;
      resolve(limitBoardHistory({ undo: Array.isArray(value?.undo) ? value.undo : [], redo: Array.isArray(value?.redo) ? value.redo : [] }));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveBoardHistory(boardId: string, clientId: string, history: StoredBoardHistory) {
  const db = await openHistory(); const limited = limitBoardHistory(history);
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ key: `${boardId}:${clientId}`, ...limited, updatedAt: Date.now() });
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
