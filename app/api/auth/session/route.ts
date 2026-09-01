import { authConfigured, authenticatedUser, authProvidersConfigured } from "@/lib/local-auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json(
    {
      configured: authConfigured(),
      providers: authProvidersConfigured(),
      user: await authenticatedUser(request),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
