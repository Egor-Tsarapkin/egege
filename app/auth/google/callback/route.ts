import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE,
  GOOGLE_AUTH_STATE_COOKIE,
  createLocalSession,
  usesSecureCookies,
} from "@/lib/local-auth-server";

export const dynamic = "force-dynamic";

type OAuthState = { state: string; verifier: string; redirectUri: string };
type GoogleToken = { access_token?: string };
type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

function publicUrl(request: NextRequest, path: string) {
  return new URL(path, process.env.SITE_URL || request.nextUrl.origin);
}

function fail(request: NextRequest, code: string) {
  const response = NextResponse.redirect(publicUrl(request, `/?auth=${code}`));
  response.cookies.delete(GOOGLE_AUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  let oauth: OAuthState | null = null;
  try {
    oauth = JSON.parse(request.cookies.get(GOOGLE_AUTH_STATE_COOKIE)?.value ?? "null") as OAuthState | null;
  } catch {
    oauth = null;
  }
  if (!code || !returnedState || !oauth || returnedState !== oauth.state) return fail(request, "google-state-error");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: oauth.redirectUri,
      code_verifier: oauth.verifier,
    }),
    cache: "no-store",
  });
  const token = (await tokenResponse.json().catch(() => ({}))) as GoogleToken;
  if (!tokenResponse.ok || !token.access_token) return fail(request, "google-token-error");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const profile = (await profileResponse.json().catch(() => ({}))) as GoogleProfile;
  if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
    return fail(request, "google-profile-error");
  }

  const session = await createLocalSession({
    provider: "google",
    providerUserId: profile.sub,
    email: profile.email,
    name: profile.name || profile.given_name || profile.email.split("@")[0],
    avatarUrl: profile.picture,
  });
  const response = NextResponse.redirect(publicUrl(request, "/?auth=success"));
  response.cookies.delete(GOOGLE_AUTH_STATE_COOKIE);
  response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: usesSecureCookies(request),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE,
  });
  return response;
}
