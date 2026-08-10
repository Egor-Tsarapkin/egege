function safeFileNamePart(value: string) {
  return value.replace(/[\\/\r\n"]/g, "-").trim();
}

export function taskDownloadName(fileName: string, taskId: string) {
  const safeName = safeFileNamePart(fileName) || "file";
  const extensionIndex = safeName.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const stem = hasExtension ? safeName.slice(0, extensionIndex) : safeName;
  const extension = hasExtension ? safeName.slice(extensionIndex) : "";
  return `${stem}_${safeFileNamePart(taskId)}${extension}`;
}

export function taskDownloadHref(href: string, fileName: string, taskId: string) {
  if (!href.startsWith("/api/task-file")) return href;

  const [path, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("name", taskDownloadName(fileName, taskId));
  return `${path}?${params.toString()}`;
}
