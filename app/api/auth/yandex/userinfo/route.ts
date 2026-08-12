export const dynamic = "force-dynamic";

type YandexUser = {
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

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^(?:Bearer|OAuth)\s+(.+)$/i)?.[1];
  if (!token) {
    return Response.json({ error: "Missing access token" }, { status: 401 });
  }

  const response = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return Response.json({ error: "Could not load Yandex profile" }, { status: 401 });
  }

  const profile = (await response.json()) as YandexUser;
  if (!profile.id) {
    return Response.json({ error: "Yandex profile has no user ID" }, { status: 502 });
  }

  const email = profile.default_email ?? profile.emails?.[0];
  const name =
    profile.real_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.display_name ||
    profile.login;
  const avatar =
    !profile.is_avatar_empty && profile.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
      : undefined;

  return Response.json({
    sub: profile.id,
    id: profile.id,
    email,
    email_verified: Boolean(email),
    name,
    full_name: name,
    given_name: profile.first_name,
    family_name: profile.last_name,
    preferred_username: profile.login,
    picture: avatar,
  });
}
