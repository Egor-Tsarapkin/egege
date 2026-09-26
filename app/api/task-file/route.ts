export const dynamic = "force-dynamic";

function safeDownloadName(value: string) {
  return value
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "-")
    .slice(0, 160);
}

function cacheHeaders(contentType: string, downloadName: string): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": contentType || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    "X-Content-Type-Options": "nosniff",
  };
}

function copyHeader(source: Headers, target: Record<string, string>, name: string) {
  const value = source.get(name);
  if (value) target[name] = value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceValue = url.searchParams.get("source");
  const requestedName = safeDownloadName(url.searchParams.get("name") ?? "material");
  const taskId = url.searchParams.get("taskId") ?? "";
  const fileIndex = Number(url.searchParams.get("fileIndex") ?? 0);

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

  const requestRange = request.headers.get("range");

  const fetchFile = (fileUrl: URL) => fetch(fileUrl, {
    headers: {
      Accept: "*/*",
      "User-Agent": "EGEGE educational file mirror",
      ...(requestRange ? { Range: requestRange } : {}),
    },
  });
  let sourceResponse = await fetchFile(source);
  if ((!sourceResponse.ok || !sourceResponse.body) && /^\d{1,20}$/.test(taskId) && Number.isInteger(fileIndex) && fileIndex >= 0) {
    const currentTaskResponse = await fetch(`https://kompege.ru/api/v1/task/${taskId}`, {
      headers: { Accept: "application/json", "User-Agent": "EGEGE educational file mirror" },
    });
    if (currentTaskResponse.ok) {
      const currentTask = await currentTaskResponse.json() as { files?: Array<{ url?: string }> };
      const currentSource = currentTask.files?.[fileIndex]?.url;
      if (currentSource) {
        const currentUrl = new URL(currentSource, "https://kompege.ru");
        if (currentUrl.protocol === "https:" && currentUrl.hostname === "kompege.ru" && currentUrl.pathname.startsWith("/files/")) {
          sourceResponse = await fetchFile(currentUrl);
        }
      }
    }
  }
  if (!sourceResponse.ok || !sourceResponse.body) {
    return Response.json({ error: "Файл временно недоступен" }, { status: 502 });
  }

  const contentType = sourceResponse.headers.get("content-type") ?? "application/octet-stream";
  const headers = cacheHeaders(contentType, requestedName);
  copyHeader(sourceResponse.headers, headers, "content-length");
  copyHeader(sourceResponse.headers, headers, "content-range");
  copyHeader(sourceResponse.headers, headers, "accept-ranges");
  copyHeader(sourceResponse.headers, headers, "etag");
  copyHeader(sourceResponse.headers, headers, "last-modified");

  // Stream the authoritative source. A stale object-store copy previously made
  // individual attachments hang even though the source file was healthy.
  return new Response(sourceResponse.body, {
    status: sourceResponse.status,
    headers,
  });
}
