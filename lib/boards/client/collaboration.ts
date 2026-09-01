import type { AppliedBoardMutation, BoardMutation } from "../operations";

export type RemoteCursor = { clientId: string; name: string; x: number; y: number; at: number };
export type RemoteStroke = { clientId: string; strokeId: string; color: string; size: number; points: number[][] };
export type CollaborationEvent =
  | { type: "state"; state: "connecting" | "connected" | "disconnected"; message?: string }
  | { type: "participants"; participants: Array<{ clientId: string; name: string }> }
  | { type: "cursor"; cursor: RemoteCursor }
  | { type: "stroke"; stroke: RemoteStroke }
  | { type: "stroke-end"; strokeId: string }
  | { type: "operation-ack"; operationId: string }
  | { type: "operation"; operation: AppliedBoardMutation }
  | { type: "background"; backgroundType: "plain" | "dots" | "grid" | "ruled"; backgroundColor: string }
  | { type: "error"; message: string };

export class BoardCollaboration {
  private socket: WebSocket | null = null;
  private token = "";
  private stopped = false;
  private reconnects = 0;
  private timer = 0;

  constructor(
    private boardId: string,
    private shareToken: string,
    private guestName: string,
    private clientId: string,
    private listener: (event: CollaborationEvent) => void,
  ) {}

  async connect() {
    if (this.stopped) return;
    this.listener({ type: "state", state: "connecting" });
    try {
      const response = await fetch(`/api/boards/${this.boardId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-board-share": this.shareToken },
        body: JSON.stringify({ share: this.shareToken, name: this.guestName, clientId: this.clientId }),
      });
      const body = await response.json() as { token?: string; error?: string };
      if (!response.ok || !body.token) throw new Error(body.error || "Realtime пока недоступен");
      this.token = body.token;
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const localDevelopmentUrl = location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? `${protocol}//${location.hostname}:3001`
        : "";
      const url = process.env.NEXT_PUBLIC_BOARD_REALTIME_URL || localDevelopmentUrl || `${protocol}//${location.host}/boards/realtime`;
      const socket = new WebSocket(url); this.socket = socket;
      socket.onopen = () => socket.send(JSON.stringify({ type: "join", token: this.token }));
      socket.onmessage = (event) => this.handle(JSON.parse(String(event.data)) as Record<string, unknown>);
      socket.onclose = () => this.reconnect();
      socket.onerror = () => socket.close();
    } catch (error) {
      this.listener({ type: "state", state: "disconnected", message: error instanceof Error ? error.message : "Realtime недоступен" });
      this.reconnect();
    }
  }

  private handle(message: Record<string, unknown>) {
    if (message.type === "joined") { this.reconnects = 0; this.listener({ type: "state", state: "connected" }); this.listener({ type: "participants", participants: message.participants as Array<{ clientId: string; name: string }> }); }
    else if (message.type === "participant-joined" || message.type === "participant-left") this.listener({ type: "participants", participants: message.participants as Array<{ clientId: string; name: string }> });
    else if (message.type === "cursor") this.listener({ type: "cursor", cursor: message as unknown as RemoteCursor });
    else if (message.type === "stroke-preview") this.listener({ type: "stroke", stroke: message as unknown as RemoteStroke });
    else if (message.type === "stroke-end") this.listener({ type: "stroke-end", strokeId: String(message.strokeId) });
    else if (message.type === "operation-ack") this.listener({ type: "operation-ack", operationId: String((message.operation as AppliedBoardMutation | undefined)?.id ?? "") });
    else if (message.type === "operation") this.listener({ type: "operation", operation: message.operation as AppliedBoardMutation });
    else if (message.type === "background") this.listener({ type: "background", backgroundType: message.backgroundType as "plain" | "dots" | "grid" | "ruled", backgroundColor: String(message.backgroundColor) });
    else if (message.type === "error") this.listener({ type: "error", message: String(message.message || "Ошибка совместной работы") });
  }

  private reconnect() {
    if (this.stopped) return;
    this.listener({ type: "state", state: "disconnected", message: "Соединение потеряно" });
    window.clearTimeout(this.timer);
    const delay = Math.min(12_000, 700 * 2 ** Math.min(5, this.reconnects++));
    this.timer = window.setTimeout(() => void this.connect(), delay + Math.random() * 350);
  }

  sendCursor(x: number, y: number) { this.send({ type: "cursor", x, y }); }
  sendStroke(strokeId: string, color: string, size: number, points: number[][]) { this.send({ type: "stroke-preview", strokeId, color, size, points }); }
  endStroke(strokeId: string) { this.send({ type: "stroke-end", strokeId }); }
  sendOperation(operation: BoardMutation) { this.send({ type: "operation", token: this.token, operation }); }
  sendBackground(backgroundType: "plain" | "dots" | "grid" | "ruled", backgroundColor: string) { this.send({ type: "background", token: this.token, backgroundType, backgroundColor }); }
  private send(value: unknown) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value)); }
  stop() { this.stopped = true; window.clearTimeout(this.timer); this.socket?.close(); }
}
