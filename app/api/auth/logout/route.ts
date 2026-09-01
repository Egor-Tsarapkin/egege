import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, revokeLocalSession } from "@/lib/local-auth-server";

export async function POST(request: NextRequest) {
  await revokeLocalSession(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_SESSION_COOKIE);
  return response;
}
