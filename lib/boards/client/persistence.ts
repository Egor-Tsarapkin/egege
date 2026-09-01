import type { AppliedBoardMutation, BoardMutation } from "../operations";
import type { BoardObject } from "../types";

type ConnectionState = "saved" | "saving" | "offline";
type Listener = (state: ConnectionState, pending: number) => void;

const DB_NAME = "egege-boards-v1";
const STORE = "outbox";

function openOutbox() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function outboxValues(boardId: string) {
  const db = await openOutbox();
  return new Promise<Array<{ key: string; boardId: string; mutation: BoardMutation; order?: number }>>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.filter((item) => item.boardId === boardId));
    request.onerror = () => reject(request.error);
  });
}

async function putOutbox(boardId: string, mutation: BoardMutation, order: number) {
  const db = await openOutbox();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ key: `${boardId}:${mutation.id}`, boardId, mutation, order });
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

async function removeOutbox(boardId: string, operationId: string) {
  const db = await openOutbox();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(`${boardId}:${operationId}`);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

export class BoardPersistence {
  private flushing = false;
  private disposed = false;
  private pending = 0;
  private retryTimer = 0;
  private submitOrder = Date.now() * 1000;

  constructor(private boardId: string, private shareToken: string, private clientId: string, private listener: Listener) {}

  private headers() {
    return { "Content-Type": "application/json", "x-board-share": this.shareToken, "x-board-client": this.clientId };
  }

  async load() {
    const response = await fetch(`/api/boards/${this.boardId}/objects`, { headers: this.headers() });
    const body = await response.json() as { objects?: BoardObject[]; latestSequence?: number; error?: string };
    if (!response.ok) throw new Error(body.error || "Не удалось открыть доску");
    void this.flush();
    return { objects: body.objects ?? [], latestSequence: body.latestSequence ?? 0 };
  }

  async submit(mutation: BoardMutation) {
    await putOutbox(this.boardId, mutation, ++this.submitOrder);
    this.pending += 1;
    this.listener(navigator.onLine ? "saving" : "offline", this.pending);
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => void this.flush(), 800);
  }

  async acknowledge(operationId: string) {
    if (!operationId) return;
    await removeOutbox(this.boardId, operationId);
    const values = await outboxValues(this.boardId);
    this.pending = values.length;
    this.listener(this.pending ? "saving" : "saved", this.pending);
  }

  async flush() {
    if (this.flushing || this.disposed || !navigator.onLine) return;
    this.flushing = true;
    try {
      const values = (await outboxValues(this.boardId)).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
      this.pending = values.length;
      for (const item of values) {
        const response = await fetch(`/api/boards/${this.boardId}/objects`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(item.mutation),
        });
        const body = await response.json() as { operation?: AppliedBoardMutation; error?: string };
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            await removeOutbox(this.boardId, item.mutation.id);
            this.pending -= 1;
            throw new Error(body.error || "Изменение отклонено");
          }
          throw new Error(body.error || "Сервер временно недоступен");
        }
        await removeOutbox(this.boardId, item.mutation.id);
        this.pending -= 1;
      }
      this.listener("saved", 0);
    } catch {
      this.listener("offline", this.pending);
      window.clearTimeout(this.retryTimer);
      this.retryTimer = window.setTimeout(() => void this.flush(), 2500);
    } finally { this.flushing = false; }
  }

  dispose() { this.disposed = true; window.clearTimeout(this.retryTimer); }
}
