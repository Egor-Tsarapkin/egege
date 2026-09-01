import { cleanBackground, cleanBoardColor, updateBoardMetadata } from "@/lib/boards/server";
import { verifyBoardSession } from "@/lib/boards/session-token";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await context.params;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const identity = await verifyBoardSession(token);
  if (!identity || identity.boardId !== boardId) return Response.json({ error: "Сеанс доски истёк" }, { status: 401 });
  if (identity.permission !== "edit") return Response.json({ error: "Ссылка разрешает только просмотр" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { backgroundType?: unknown; backgroundColor?: unknown };
  const backgroundType = cleanBackground(body.backgroundType); const backgroundColor = cleanBoardColor(body.backgroundColor);
  if (!backgroundType || !backgroundColor) return Response.json({ error: "Некорректный фон" }, { status: 400 });
  return Response.json({ board: await updateBoardMetadata(boardId, { backgroundType, backgroundColor }) });
}
