import { requireBoardOwner, rotateBoardShare, shareStatus } from "@/lib/boards/server";
import type { BoardPermission } from "@/lib/boards/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const owner = await requireBoardOwner(request, boardId);
  if (!owner) return Response.json({ error: "Настройки доступны только владельцу" }, { status: 403 });
  const status = await shareStatus(boardId);
  return Response.json({ enabled: Boolean(status), permission: status?.permission ?? null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const owner = await requireBoardOwner(request, boardId);
  if (!owner) return Response.json({ error: "Настройки доступны только владельцу" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { permission?: BoardPermission | "off" };
  const permission = body.permission === "view" || body.permission === "edit" ? body.permission : null;
  if (body.permission !== "off" && !permission) {
    return Response.json({ error: "Выберите просмотр или редактирование" }, { status: 400 });
  }
  const share = await rotateBoardShare(boardId, permission);
  return Response.json({
    enabled: Boolean(share),
    permission: share?.permission ?? null,
    shareUrl: share ? `/boards/${boardId}?share=${share.token}` : null,
  });
}
