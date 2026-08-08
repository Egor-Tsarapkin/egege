export const dynamic = "force-dynamic";

export async function GET() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const siteUrl = process.env.SITE_URL;

  if (!url || !publishableKey) {
    return Response.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { configured: true, url, anonKey: publishableKey, siteUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
