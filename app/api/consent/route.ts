import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema } from "@/lib/admin-server";
import { DATA_CONSENT_VERSION, DISTRIBUTION_CONSENT_VERSION, TERMS_VERSION } from "@/lib/legal";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти" }, 401);
  await ensureAdminSchema();
  const saved = await communityDb().prepare(
    `SELECT data_version, data_accepted_at, distribution_version, distribution_accepted_at,
            terms_version, terms_accepted_at
     FROM privacy_consents WHERE user_id = ?`,
  ).bind(user.id).first<{
    data_version: string;
    data_accepted_at: number;
    distribution_version: string;
    distribution_accepted_at: number | null;
    terms_version: string;
    terms_accepted_at: number;
  }>();
  return response({
    dataAccepted: saved?.data_version === DATA_CONSENT_VERSION && Boolean(saved.data_accepted_at),
    distributionAccepted:
      saved?.distribution_version === DISTRIBUTION_CONSENT_VERSION &&
      Boolean(saved.distribution_accepted_at),
    termsAccepted: saved?.terms_version === TERMS_VERSION && Boolean(saved.terms_accepted_at),
    versions: { data: DATA_CONSENT_VERSION, distribution: DISTRIBUTION_CONSENT_VERSION, terms: TERMS_VERSION },
  });
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти" }, 401);
  const body = await request.json().catch(() => null) as null | {
    dataConsent?: unknown;
    distributionConsent?: unknown;
    termsConsent?: unknown;
  };
  if (
    body?.dataConsent !== true ||
    body.termsConsent !== true ||
    typeof body.distributionConsent !== "boolean"
  ) {
    return response({ error: "Подтвердите согласие и пользовательское соглашение" }, 400);
  }
  await ensureAdminSchema();
  const now = Math.floor(Date.now() / 1000);
  await communityDb().prepare(
    `INSERT INTO privacy_consents
       (user_id, data_version, data_accepted_at, distribution_version,
        distribution_accepted_at, terms_version, terms_accepted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       data_version = excluded.data_version,
       data_accepted_at = excluded.data_accepted_at,
       distribution_version = excluded.distribution_version,
       distribution_accepted_at = excluded.distribution_accepted_at,
       terms_version = excluded.terms_version,
       terms_accepted_at = excluded.terms_accepted_at,
       updated_at = excluded.updated_at`,
  ).bind(
    user.id,
    DATA_CONSENT_VERSION,
    now,
    DISTRIBUTION_CONSENT_VERSION,
    body.distributionConsent ? now : null,
    TERMS_VERSION,
    now,
    now,
  ).run();
  return response({ ok: true, dataAccepted: true, distributionAccepted: body.distributionConsent, termsAccepted: true });
}
