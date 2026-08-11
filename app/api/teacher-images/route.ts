import { env } from "cloudflare:workers";
import { authenticatedUser } from "@/lib/community-server";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

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
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  if (!env.FILES) return Response.json({ error: "Хранилище изображений недоступно" }, { status: 503 });
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return Response.json({ error: "Выберите изображение" }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_SIZE) {
    return Response.json({ error: "Изображение больше 8 МБ" }, { status: 400 });
  }
  const key = `teacher-images/${user.id}/${crypto.randomUUID()}`;
  await env.FILES.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
  return Response.json({ url: `/api/teacher-images?key=${encodeURIComponent(key)}` });
}
