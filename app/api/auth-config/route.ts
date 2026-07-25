export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return Response.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { configured: true, url, anonKey: publishableKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
