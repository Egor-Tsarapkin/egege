import { authenticatedUser } from "@/lib/community-server";
import { BoardLimitError, boardQuota, cleanBoardTitle, createBoard, listOwnedBoards } from "@/lib/boards/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  const search = new URL(request.url).searchParams.get("search") ?? "";
  const [boards, quota] = await Promise.all([listOwnedBoards(user.id, search), boardQuota(user.id)]);
  return Response.json({ boards, quota });
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { title?: unknown };
  try {
    const board = await createBoard(user, cleanBoardTitle(body.title));
    return Response.json({ board }, { status: 201 });
  } catch (error) {
    if (error instanceof BoardLimitError) return Response.json({ error: error.message, limit: error.limit }, { status: 409 });
    throw error;
  }
}
