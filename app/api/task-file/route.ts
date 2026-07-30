import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type FileEnvironment = {
  FILES?: R2Bucket;
};

function safeDownloadName(value: string) {
  return value
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "-")
    .slice(0, 160);
}

function cacheHeaders(contentType: string, downloadName: string) {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": contentType || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceValue = url.searchParams.get("source");
  const requestedName = safeDownloadName(url.searchParams.get("name") ?? "material");

  if (!sourceValue) {
    return Response.json({ error: "Не указан адрес файла" }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(sourceValue);
  } catch {
    return Response.json({ error: "Некорректный адрес файла" }, { status: 400 });
  }

  if (source.protocol !== "https:" || source.hostname !== "kompege.ru" || !source.pathname.startsWith("/files/")) {
    return Response.json({ error: "Этот источник не разрешён" }, { status: 403 });
  }

  const bucket = (env as unknown as FileEnvironment).FILES;
  const key = `kompege${source.pathname}`;

  if (bucket) {
    const cached = await bucket.get(key);
    if (cached) {
      const headers = cacheHeaders(
        cached.httpMetadata?.contentType ?? "application/octet-stream",
        requestedName,
      );
      return new Response(cached.body, { headers });
    }
  }

  const sourceResponse = await fetch(source, {
    headers: {
      Accept: "*/*",
      "User-Agent": "EGEGE educational file mirror",
    },
  });
  if (!sourceResponse.ok || !sourceResponse.body) {
    return Response.json({ error: "Файл временно недоступен" }, { status: 502 });
  }

  const contentType = sourceResponse.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await sourceResponse.arrayBuffer();

  if (bucket) {
    await bucket.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { source: source.href, originalName: requestedName },
    });
  }

  return new Response(bytes, {
    headers: cacheHeaders(contentType, requestedName),
  });
}
