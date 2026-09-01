import { env } from "cloudflare:workers";
import { communityDb } from "@/lib/community-server";
import { resolveBoardAccess } from "@/lib/boards/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  if (!env.FILES) return new Response("Storage unavailable", { status: 503 });
  const { assetId } = await context.params;
  if (!/^ast_[a-f0-9]{24}$/.test(assetId)) return new Response("Not found", { status: 404 });
  const result = await communityDb().prepare(`SELECT board_id, storage_key, thumbnail_key, content_type
    FROM board_assets WHERE id = ? AND deleted_at IS NULL LIMIT 20`).bind(assetId)
    .all<{ board_id: string; storage_key: string; thumbnail_key: string; content_type: string }>();
  let row: (typeof result.results)[number] | null = null;
  for (const candidate of result.results) if (await resolveBoardAccess(request, candidate.board_id)) { row = candidate; break; }
  if (!row) return new Response("Not found", { status: 404 });
  const thumbnail = new URL(request.url).searchParams.get("thumbnail") === "1";
  const object = await env.FILES.get(thumbnail ? row.thumbnail_key : row.storage_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "Cache-Control": "private, max-age=3600", "Content-Type": row.content_type, "X-Content-Type-Options": "nosniff" });
  const download = new URL(request.url).searchParams.get("download");
  if (download) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download.replace(/[\r\n]/g, "").slice(0, 180))}`);
  object.writeHttpMetadata?.(headers); return new Response(object.body, { headers });
}
