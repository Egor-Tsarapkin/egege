import { authenticatedUser } from "@/lib/community-server";
import { ensureUserAccess, isAdminUser } from "@/lib/admin-server";

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  await ensureUserAccess(user);
  return Response.json({
    isAdmin: await isAdminUser(user),
  });
}
