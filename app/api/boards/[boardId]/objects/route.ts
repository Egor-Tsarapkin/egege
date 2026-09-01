import { applyBoardMutation, listBoardObjects, listBoardOperations } from "@/lib/boards/operations";
import { resolveBoardAccess } from "@/lib/boards/server";
import type { BoardBounds } from "@/lib/boards/types";

export const runtime = "nodejs";

function viewport(request: Request): BoardBounds | undefined {
  const params = new URL(request.url).searchParams;
  if (!["minX", "minY", "maxX", "maxY"].every((key) => params.has(key))) return undefined;
  const bounds = {
    minX: Number(params.get("minX")),
    minY: Number(params.get("minY")),
    maxX: Number(params.get("maxX")),
    maxY: Number(params.get("maxY")),
  };
  return Object.values(bounds).every(Number.isFinite) ? bounds : undefined;
}

export async function GET(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await context.params;
  const access = await resolveBoardAccess(request, boardId);
  if (!access) return Response.json({ error: "Доска не найдена или ссылка устарела" }, { status: 404 });
  const afterSequence = Math.max(0, Number(new URL(request.url).searchParams.get("after") ?? 0));
  if (afterSequence > 0) {
    const operations = await listBoardOperations(boardId, afterSequence);
    return Response.json({ operations, latestSequence: access.board.latestSequence });
  }
  const objects = await listBoardObjects(boardId, viewport(request));
  return Response.json({ objects, latestSequence: access.board.latestSequence });
}

export async function POST(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await context.params;
  const access = await resolveBoardAccess(request, boardId);
  if (!access) return Response.json({ error: "Нет доступа к доске" }, { status: 403 });
  if (access.permission !== "edit") return Response.json({ error: "Ссылка разрешает только просмотр" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 1_500_000) {
    return Response.json({ error: "Изменение слишком большое" }, { status: 413 });
  }
  try {
    const body = await request.json();
    const actorId = access.userId ?? request.headers.get("x-board-client")?.slice(0, 80) ?? "guest";
    const result = await applyBoardMutation(boardId, actorId, access.userId ? "user" : "guest", body);
    return Response.json({ operation: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить изменение";
    return Response.json({ error: message }, { status: 400 });
  }
}
