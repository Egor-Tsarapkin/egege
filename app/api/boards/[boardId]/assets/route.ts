import { env } from "cloudflare:workers";
import sharp from "sharp";
import { communityDb } from "@/lib/community-server";
import { BOARD_ASSET_LIMIT, resolveBoardAccess } from "@/lib/boards/server";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const BLOCKED = new Set(["text/html", "image/svg+xml", "application/javascript", "text/javascript", "application/x-sh", "application/x-msdownload"]);

function randomAssetId() {
  const bytes = new Uint8Array(12); crypto.getRandomValues(bytes);
  return `ast_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function POST(request: Request, context: { params: Promise<{ boardId: string }> }) {
  if (!env.FILES) return Response.json({ error: "Хранилище изображений не настроено" }, { status: 503 });
  const { boardId } = await context.params;
  const access = await resolveBoardAccess(request, boardId);
  if (!access || access.permission !== "edit") return Response.json({ error: "Нет права на загрузку" }, { status: 403 });
  try {
    const form = await request.formData(); const file = form.get("image") ?? form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Выберите файл" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Файл должен быть не больше 15 МБ" }, { status: 413 });
    if (BLOCKED.has(file.type) || /\.(?:html?|svg|js|mjs|sh|exe|bat|cmd)$/i.test(file.name)) return Response.json({ error: "Этот тип файла нельзя загружать" }, { status: 415 });
    const original = new Uint8Array(await file.arrayBuffer());
    if (!ALLOWED.has(file.type)) {
      if (access.board.storageBytes + original.byteLength > BOARD_ASSET_LIMIT) return Response.json({ error: "На доске закончилось место (100 МБ)" }, { status: 413 });
      const id = randomAssetId(); const safeName = file.name.replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 180) || "file"; const storageKey = `boards/${boardId}/${id}-${safeName}`;
      await env.FILES.put(storageKey, original, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      const now = Math.floor(Date.now() / 1000); const size = original.byteLength;
      await communityDb().batch([
        communityDb().prepare(`INSERT INTO board_assets (board_id, id, storage_key, thumbnail_key, content_type, width, height, size, sha256, uploaded_by, created_at) VALUES (?, ?, ?, '', ?, 0, 0, ?, ?, ?, ?)`).bind(boardId, id, storageKey, file.type || "application/octet-stream", size, hex(await crypto.subtle.digest("SHA-256", original)), access.userId ?? "guest", now),
        communityDb().prepare("UPDATE boards SET storage_bytes = storage_bytes + ?, updated_at = ? WHERE id = ?").bind(size, now, boardId),
      ]);
      return Response.json({ asset: { id, src: `/api/boards/assets/${id}`, name: safeName, mime: file.type || "application/octet-stream", size } }, { status: 201 });
    }
    const inspector = sharp(original, { failOn: "error", limitInputPixels: 40_000_000 });
    const metadata = await inspector.metadata();
    if (!metadata.width || !metadata.height || !["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new Error("Файл не является корректным изображением");
    if (metadata.width * metadata.height > 40_000_000) throw new Error("Слишком большое разрешение изображения");
    const normalized = await sharp(original).rotate().resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true }).webp({ quality: 91, effort: 4 }).toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(normalized.data).resize({ width: 480, height: 320, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 3 }).toBuffer();
    if (access.board.storageBytes + normalized.data.byteLength + thumbnail.byteLength > BOARD_ASSET_LIMIT) return Response.json({ error: "На доске закончилось место для изображений (100 МБ)" }, { status: 413 });
    const id = randomAssetId(); const storageKey = `boards/${boardId}/${id}.webp`; const thumbnailKey = `boards/${boardId}/${id}.thumb.webp`;
    await Promise.all([
      env.FILES.put(storageKey, normalized.data, { httpMetadata: { contentType: "image/webp" } }),
      env.FILES.put(thumbnailKey, thumbnail, { httpMetadata: { contentType: "image/webp" } }),
    ]);
    const now = Math.floor(Date.now() / 1000); const size = normalized.data.byteLength + thumbnail.byteLength;
    await communityDb().batch([
      communityDb().prepare(`INSERT INTO board_assets
        (board_id, id, storage_key, thumbnail_key, content_type, width, height, size, sha256, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, 'image/webp', ?, ?, ?, ?, ?, ?)`)
        .bind(boardId, id, storageKey, thumbnailKey, normalized.info.width, normalized.info.height, size,
          hex(await crypto.subtle.digest("SHA-256", original)), access.userId ?? "guest", now),
      communityDb().prepare("UPDATE boards SET storage_bytes = storage_bytes + ?, updated_at = ? WHERE id = ?")
        .bind(size, now, boardId),
    ]);
    return Response.json({ asset: { id, src: `/api/boards/assets/${id}`, width: normalized.info.width, height: normalized.info.height, size } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось обработать изображение" }, { status: 400 });
  }
}
