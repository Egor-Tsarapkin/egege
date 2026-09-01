import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_STATE_MAX_AGE,
  GOOGLE_AUTH_STATE_COOKIE,
  authProvidersConfigured,
  newOAuthState,
  pkceChallenge,
  usesSecureCookies,
} from "@/lib/local-auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!authProvidersConfigured().google) {
    return NextResponse.redirect(new URL("/?auth=google-not-configured", process.env.SITE_URL || request.nextUrl.origin));
  }

  const oauth = newOAuthState();
  const redirectUri = new URL("/auth/google/callback", process.env.SITE_URL || request.nextUrl.origin).toString();
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", oauth.state);
  authorize.searchParams.set("prompt", "select_account");
  authorize.searchParams.set("code_challenge", await pkceChallenge(oauth.verifier));
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, JSON.stringify({ ...oauth, redirectUri }), {
    httpOnly: true,
    secure: usesSecureCookies(request),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_STATE_MAX_AGE,
  });
  return response;
}
