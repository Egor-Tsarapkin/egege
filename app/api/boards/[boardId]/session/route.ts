import { authenticatedUser } from "@/lib/community-server";
import {
  cleanGuestName,
  resolveBoardAccess,
  shareTokenFromRequest,
  userDisplayName,
} from "@/lib/boards/server";
import { newClientId, signBoardSession } from "@/lib/boards/session-token";

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const body = await request.json().catch(() => ({})) as { name?: unknown; share?: unknown; clientId?: unknown };
  const share = typeof body.share === "string" ? body.share : shareTokenFromRequest(request);
  const access = await resolveBoardAccess(request, boardId, share);
  if (!access) return Response.json({ error: "Доска не найдена или ссылка устарела" }, { status: 404 });
  const user = await authenticatedUser(request);
  const guestName = cleanGuestName(body.name);
  if (!user && !guestName) {
    return Response.json({ error: "Укажите короткое имя" }, { status: 400 });
  }
  const requestedClientId = typeof body.clientId === "string" && /^cli_[a-f0-9]{24}$/.test(body.clientId)
    ? body.clientId
    : newClientId();
  const now = Math.floor(Date.now() / 1000);
  const identity = {
    boardId,
    clientId: requestedClientId,
    actorId: user?.id ?? requestedClientId,
    actorKind: user ? "user" as const : "guest" as const,
    displayName: user ? userDisplayName(user) : guestName,
    permission: access.permission,
    expiresAt: now + (12 * 60 * 60),
  };
  try {
    return Response.json({
      access,
      identity,
      token: await signBoardSession(identity),
      realtimeUrl: "/boards/realtime",
    });
  } catch {
    return Response.json({ error: "Realtime пока не настроен на сервере" }, { status: 503 });
  }
}
