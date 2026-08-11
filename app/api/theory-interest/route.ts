import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureTheoryInterestSchema, theoryInterestState } from "@/lib/theory-interest-server";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти в аккаунт." }, 401);

  try {
    return response(await theoryInterestState(user.id));
  } catch (error) {
    console.error("Theory interest GET failed", error);
    return response({ error: "Счётчик временно недоступен." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти в аккаунт." }, 401);

  try {
    await ensureTheoryInterestSchema();
    await communityDb()
      .prepare("INSERT OR IGNORE INTO theory_interest (user_id, created_at) VALUES (?, ?)")
      .bind(user.id, Math.floor(Date.now() / 1000))
      .run();
    return response(await theoryInterestState(user.id));
  } catch (error) {
    console.error("Theory interest POST failed", error);
    return response({ error: "Не удалось сохранить голос." }, 503);
  }
}
