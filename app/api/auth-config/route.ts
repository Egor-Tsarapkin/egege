export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return Response.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { configured: true, url, anonKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
