import { applyBoardMutation } from "@/lib/boards/operations";
import { verifyBoardSession } from "@/lib/boards/session-token";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await context.params;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const identity = await verifyBoardSession(token);
  if (!identity || identity.boardId !== boardId) return Response.json({ error: "Сеанс доски истёк" }, { status: 401 });
  if (identity.permission !== "edit") return Response.json({ error: "Доска доступна только для просмотра" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 1_500_000) return Response.json({ error: "Изменение слишком большое" }, { status: 413 });
  try {
    const operation = await applyBoardMutation(boardId, identity.actorId, identity.actorKind, await request.json());
    return Response.json({ operation });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось сохранить изменение" }, { status: 400 });
  }
}
