import { env } from "cloudflare:workers";
import { authenticatedUser } from "@/lib/community-server";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function hasSafeImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10]
      .every((value, index) => bytes[index] === value);
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/gif") {
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 6));
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (contentType === "image/webp") {
    const riff = new TextDecoder("ascii").decode(bytes.slice(0, 4));
    const webp = new TextDecoder("ascii").decode(bytes.slice(8, 12));
    return bytes.length >= 12 && riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

export async function GET(request: Request) {
  if (!env.FILES) return new Response("Not found", { status: 404 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^teacher-images\/[a-zA-Z0-9:_-]+\/[a-f0-9-]{36}$/.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; sandbox");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  if (!env.FILES) return Response.json({ error: "Хранилище изображений недоступно" }, { status: 503 });
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type)) {
    return Response.json({ error: "Поддерживаются PNG, JPEG, WebP и GIF" }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_SIZE) {
    return Response.json({ error: "Изображение больше 8 МБ" }, { status: 400 });
  }
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasSafeImageSignature(bytes, image.type)) {
    return Response.json({ error: "Файл не похож на корректное изображение" }, { status: 400 });
  }
  const key = `teacher-images/${user.id}/${crypto.randomUUID()}`;
  await env.FILES.put(key, bytes, { httpMetadata: { contentType: image.type } });
  return Response.json({ url: `/api/teacher-images?key=${encodeURIComponent(key)}` });
}
