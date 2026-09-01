import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  AUTH_STATE_MAX_AGE,
  authConfigured,
  newOAuthState,
  pkceChallenge,
  usesSecureCookies,
} from "@/lib/local-auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.redirect(new URL("/?auth=not-configured", request.url));
  }

  const oauth = newOAuthState();
  const redirectUri = new URL("/auth/yandex/callback", process.env.SITE_URL || request.nextUrl.origin).toString();
  const authorize = new URL("https://oauth.yandex.ru/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.YANDEX_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "login:info login:email");
  authorize.searchParams.set("force_confirm", "yes");
  authorize.searchParams.set("state", oauth.state);
  authorize.searchParams.set("code_challenge", await pkceChallenge(oauth.verifier));
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(AUTH_STATE_COOKIE, JSON.stringify({ ...oauth, redirectUri }), {
    httpOnly: true,
    secure: usesSecureCookies(request),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_STATE_MAX_AGE,
  });
  return response;
}
