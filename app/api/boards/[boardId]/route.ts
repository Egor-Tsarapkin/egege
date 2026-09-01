import {
  requireBoardOwner,
  resolveBoardAccess,
  softDeleteBoard,
  updateBoardMetadata,
  validBoardId,
} from "@/lib/boards/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  if (!validBoardId(boardId)) return Response.json({ error: "Доска не найдена" }, { status: 404 });
  const access = await resolveBoardAccess(request, boardId);
  if (!access) return Response.json({ error: "Доска не найдена или ссылка устарела" }, { status: 404 });
  return Response.json({ access });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const access = await requireBoardOwner(request, boardId);
  if (!access) return Response.json({ error: "Изменять настройки может только владелец" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const board = await updateBoardMetadata(boardId, body);
    return Response.json({ board });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Некорректные данные" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const access = await requireBoardOwner(request, boardId);
  if (!access) return Response.json({ error: "Удалить доску может только владелец" }, { status: 403 });
  await softDeleteBoard(boardId);
  return Response.json({ ok: true });
}
