import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE,
  AUTH_STATE_COOKIE,
  createLocalSession,
  usesSecureCookies,
} from "@/lib/local-auth-server";

export const dynamic = "force-dynamic";

type OAuthState = { state: string; verifier: string; redirectUri: string };
type YandexToken = { access_token?: string; error?: string; error_description?: string };
type YandexProfile = {
  id?: string;
  login?: string;
  default_email?: string;
  emails?: string[];
  first_name?: string;
  last_name?: string;
  real_name?: string;
  display_name?: string;
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
};

function publicUrl(request: NextRequest, path: string) {
  return new URL(path, process.env.SITE_URL || request.nextUrl.origin);
}

function fail(request: NextRequest, code: string) {
  const response = NextResponse.redirect(publicUrl(request, `/?auth=${code}`));
  response.cookies.delete(AUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  let oauth: OAuthState | null = null;
  try {
    oauth = JSON.parse(request.cookies.get(AUTH_STATE_COOKIE)?.value ?? "null") as OAuthState | null;
  } catch {
    oauth = null;
  }
  if (!code || !returnedState || !oauth || returnedState !== oauth.state) return fail(request, "state-error");

  const tokenResponse = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.YANDEX_CLIENT_ID ?? "",
      client_secret: process.env.YANDEX_CLIENT_SECRET ?? "",
      redirect_uri: oauth.redirectUri,
      code_verifier: oauth.verifier,
    }),
    cache: "no-store",
  });
  const token = (await tokenResponse.json().catch(() => ({}))) as YandexToken;
  if (!tokenResponse.ok || !token.access_token) return fail(request, "token-error");

  const profileResponse = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${token.access_token}` },
    cache: "no-store",
  });
  const profile = (await profileResponse.json().catch(() => ({}))) as YandexProfile;
  const email = profile.default_email ?? profile.emails?.[0] ?? "";
  if (!profileResponse.ok || !profile.id || !email) return fail(request, "profile-error");

  const name = profile.real_name
    || [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.display_name
    || profile.login
    || email.split("@")[0];
  const avatarUrl = !profile.is_avatar_empty && profile.default_avatar_id
    ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
    : undefined;
  const session = await createLocalSession({
    provider: "yandex",
    providerUserId: profile.id,
    email,
    name,
    login: profile.login,
    avatarUrl,
  });

  const response = NextResponse.redirect(publicUrl(request, "/?auth=success"));
  response.cookies.delete(AUTH_STATE_COOKIE);
  response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: usesSecureCookies(request),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE,
  });
  return response;
}
