import { authenticatedUser } from "@/lib/community-server";
import { BoardLimitError, duplicateBoard, validBoardId } from "@/lib/boards/server";

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  const { boardId } = await params;
  if (!validBoardId(boardId)) return Response.json({ error: "Доска не найдена" }, { status: 404 });
  try {
    const board = await duplicateBoard(boardId, user.id);
    if (!board) return Response.json({ error: "Доска не найдена" }, { status: 404 });
    return Response.json({ board }, { status: 201 });
  } catch (error) {
    if (error instanceof BoardLimitError) return Response.json({ error: error.message, limit: error.limit }, { status: 409 });
    throw error;
  }
}
