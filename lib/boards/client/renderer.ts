import type { BoardBackground, BoardObject, CodePayload, FilePayload, ImagePayload, LinePayload, ShapePayload, StrokePayload, TaskPayload, TextPayload } from "../types";
import { outlinePath, StrokeRenderCache } from "./pen-engine";
import { selectionHandles } from "./selection";
import { highlightCode } from "./code-highlighting";
import { wrapTextLines } from "./text-layout";
import type { BoardViewport } from "./viewport";

type RenderOptions = {
  width: number;
  height: number;
  viewport: BoardViewport;
  background: BoardBackground;
  backgroundColor: string;
  selectedId?: string;
  selectedIds?: string[];
  pixelRatio?: number;
  presorted?: boolean;
};

const imageCache = new Map<string, HTMLImageElement>();
const strokeRenderCache = new StrokeRenderCache<Path2D>();

function cachedImage(src: string) {
  let image = imageCache.get(src);
  if (!image && typeof Image !== "undefined") {
    image = new Image(); image.decoding = "async"; image.src = src; image.onload = () => window.dispatchEvent(new Event("board-image-loaded")); imageCache.set(src, image);
  }
  return image;
}

function paintImage(context: CanvasRenderingContext2D, payload: ImagePayload) {
  const share = typeof location === "undefined" ? "" : new URL(location.href).searchParams.get("share") ?? "";
  const src = `${payload.src}${share ? `?share=${encodeURIComponent(share)}` : ""}`;
  const image = cachedImage(src);
  context.fillStyle = "#e8e4da"; context.fillRect(payload.x, payload.y, payload.width, payload.height);
  if (image?.complete && image.naturalWidth) context.drawImage(image, payload.x, payload.y, payload.width, payload.height);
}

function starPath(context: CanvasRenderingContext2D, payload: ShapePayload) {
  const centerX = payload.x + payload.width / 2; const centerY = payload.y + payload.height / 2;
  const outerX = payload.width / 2; const outerY = payload.height / 2;
  const innerX = outerX * .42; const innerY = outerY * .42;
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radiusX = index % 2 === 0 ? outerX : innerX; const radiusY = index % 2 === 0 ? outerY : innerY;
    const x = centerX + Math.cos(angle) * radiusX; const y = centerY + Math.sin(angle) * radiusY;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
}

function visible(object: BoardObject, options: RenderOptions) {
  const minX = -options.viewport.x / options.viewport.zoom;
  const minY = -options.viewport.y / options.viewport.zoom;
  const maxX = minX + options.width / options.viewport.zoom;
  const maxY = minY + options.height / options.viewport.zoom;
  return object.maxX >= minX && object.minX <= maxX && object.maxY >= minY && object.minY <= maxY;
}

export function paintBackground(context: CanvasRenderingContext2D, options: RenderOptions) {
  const ratio = options.pixelRatio ?? 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, options.width, options.height);
  context.fillStyle = options.backgroundColor;
  context.fillRect(0, 0, options.width, options.height);
  if (options.background === "plain") return;
  const step = (options.background === "dots" ? 24 : options.background === "ruled" ? 32 : 28) * options.viewport.zoom;
  if (step < 8) return;
  const offsetX = ((options.viewport.x % step) + step) % step;
  const offsetY = ((options.viewport.y % step) + step) % step;
  const dark = isDarkBackground(options.backgroundColor);
  context.strokeStyle = dark ? "rgba(245, 240, 228, .13)" : "rgba(45, 48, 53, .105)";
  context.fillStyle = dark ? "rgba(245, 240, 228, .24)" : "rgba(45, 48, 53, .19)";
  context.lineWidth = 1;
  if (options.background === "dots") {
    for (let x = offsetX; x < options.width; x += step) for (let y = offsetY; y < options.height; y += step) {
      context.beginPath(); context.arc(x, y, Math.max(0.7, options.viewport.zoom), 0, Math.PI * 2); context.fill();
    }
    return;
  }
  context.beginPath();
  for (let y = offsetY; y < options.height; y += step) { context.moveTo(0, y); context.lineTo(options.width, y); }
  if (options.background === "grid") for (let x = offsetX; x < options.width; x += step) { context.moveTo(x, 0); context.lineTo(x, options.height); }
  context.stroke();
}

function paintCode(context: CanvasRenderingContext2D, payload: CodePayload) {
  context.fillStyle = "#1e1f22";
  context.fillRect(payload.x, payload.y, payload.width, payload.height);
  context.strokeStyle = "#39362f"; context.lineWidth = 1;
  context.strokeRect(payload.x + .5, payload.y + .5, payload.width - 1, payload.height - 1);
  context.fillStyle = "#302d27"; context.fillRect(payload.x + 1, payload.y + 1, payload.width - 2, 47);
  context.fillStyle = "#bcbec4"; context.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(payload.language.toUpperCase(), payload.x + 16, payload.y + 29);
  const fontScale = payload.fontScale ?? 1;
  const lineHeight = 21 * fontScale;
  context.font = `${14 * fontScale}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
  const lines = highlightCode(payload.code, payload.language);
  context.save();
  context.beginPath(); context.rect(payload.x + 8, payload.y + 49, payload.width - 16, payload.height - 57); context.clip();
  const characterWidth = context.measureText(" ").width;
  lines.forEach((line, index) => {
    const baseline = payload.y + 70 + index * lineHeight;
    if (baseline > payload.y + payload.height) return;
    context.fillStyle = "#7a7e85"; context.textAlign = "right"; context.fillText(String(index + 1), payload.x + 38, baseline);
    context.textAlign = "left";
    context.save(); context.beginPath(); context.rect(payload.x + 50, payload.y + 49, payload.width - 66, payload.height - 57); context.clip();
    let left = payload.x + 50; let column = 0;
    for (const segment of line) {
      const text = segment.text;
      for (const part of text.split(/(\t)/)) {
        if (part === "\t") { const spaces = 4 - column % 4; left += characterWidth * spaces; column += spaces; }
        else { context.fillStyle = segment.color; context.fillText(part, left, baseline); left += context.measureText(part).width; column += part.length; }
      }
    }
    context.restore();
  });
  context.restore();
}

function clippedTextLines(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  return wrapTextLines(text, width, (value) => context.measureText(value).width).slice(0, maxLines);
}

function isDarkBackground(color: string) {
  const value = color.replace("#", ""); if (!/^[a-f\d]{6}$/i.test(value)) return false;
  const channels = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return channels[0] * .299 + channels[1] * .587 + channels[2] * .114 < 128;
}

function paintTask(context: CanvasRenderingContext2D, payload: TaskPayload, backgroundColor: string) {
  const dark = isDarkBackground(backgroundColor);
  const surface = dark ? "#24221e" : "#fffdf8"; const header = dark ? "#302d27" : "#ece8df";
  const ink = dark ? "#f5f0e4" : "#171613"; const bodyInk = dark ? "#e2ddd2" : "#3d3932"; const muted = dark ? "#aaa397" : "#756f65";
  context.fillStyle = surface; context.beginPath(); context.roundRect(payload.x, payload.y, payload.width, payload.height, 14); context.fill();
  context.strokeStyle = dark ? "rgba(255,255,255,.13)" : "rgba(23,22,19,.16)"; context.lineWidth = 1; context.stroke();
  context.fillStyle = header; context.fillRect(payload.x + 1, payload.y + 1, payload.width - 2, 48);
  context.fillStyle = ink; context.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; context.fillText(`Задание №${payload.number}`, payload.x + 18, payload.y + 30);
  context.fillStyle = muted; context.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; context.textAlign = "right"; context.fillText(`ID ${payload.taskId}`, payload.x + payload.width - 18, payload.y + 29); context.textAlign = "left";
  const images = payload.images ?? []; let contentY = payload.y + 66;
  if (images.length) {
    const available = Math.max(90, Math.min(payload.height * .48, images.length * 240)); const slotHeight = available / images.length;
    for (const [index, src] of images.entries()) {
      const top = contentY + index * slotHeight; context.fillStyle = dark ? "#171613" : "#f4f1e9"; context.fillRect(payload.x + 18, top, payload.width - 36, slotHeight - 12);
      const image = cachedImage(src);
      if (image?.complete && image.naturalWidth) {
        const scale = Math.min((payload.width - 48) / image.naturalWidth, (slotHeight - 24) / image.naturalHeight);
        const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
        context.drawImage(image, payload.x + (payload.width - width) / 2, top + (slotHeight - 12 - height) / 2, width, height);
      }
    }
    contentY += available + 4;
  }
  context.fillStyle = bodyInk; context.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; context.textBaseline = "top";
  const maxLines = Math.max(1, Math.floor((payload.y + payload.height - contentY - 16) / 22)); clippedTextLines(context, payload.text, payload.width - 36, maxLines).forEach((line, index) => context.fillText(line, payload.x + 18, contentY + index * 22));
  context.textBaseline = "alphabetic";
}

function paintFile(context: CanvasRenderingContext2D, payload: FilePayload) {
  context.fillStyle = "#fffdf8"; context.beginPath(); context.roundRect(payload.x, payload.y, payload.width, payload.height, 12); context.fill(); context.strokeStyle = "rgba(23,22,19,.16)"; context.stroke();
  context.fillStyle = "#2f6fed"; context.beginPath(); context.roundRect(payload.x + 14, payload.y + 14, 48, payload.height - 28, 8); context.fill(); context.fillStyle = "#fff"; context.font = '700 11px -apple-system, sans-serif'; context.textAlign = "center"; context.fillText("ФАЙЛ", payload.x + 38, payload.y + payload.height / 2 + 4); context.textAlign = "left";
  context.fillStyle = "#171613"; context.font = '700 13px -apple-system, sans-serif'; context.fillText(payload.name.slice(0, Math.max(10, Math.floor((payload.width - 100) / 7.5))), payload.x + 76, payload.y + 37);
  context.fillStyle = "#756f65"; context.font = '11px -apple-system, sans-serif'; context.fillText(`${Math.max(.1, payload.size / 1024 / 1024).toFixed(1)} МБ · нажмите, чтобы скачать`, payload.x + 76, payload.y + 59);
}

export { codeCopyButtonAt } from "./code-block";

export function paintObject(context: CanvasRenderingContext2D, object: BoardObject, backgroundColor = "#f8f5ed") {
  if (object.kind === "stroke") {
    const payload = object.payload as StrokePayload;
    context.fillStyle = payload.color;
    context.fill(strokeRenderCache.get(payload.points, payload.size, outlinePath));
    return;
  }
  if (object.kind === "text") {
    const payload = object.payload as TextPayload;
    context.fillStyle = payload.color;
    const family = payload.fontFamily === "pribambas"
      ? '"Pribambas", cursive'
      : payload.fontFamily === "mono"
        ? '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const fontFor = (size: number) => `${payload.fontStyle === "italic" ? "italic " : ""}${payload.fontWeight === 700 ? 700 : 500} ${size}px ${family}`;
    context.font = fontFor(payload.fontSize);
    context.textBaseline = "top";
    context.textAlign = payload.textAlign ?? "left";
    const textX = payload.textAlign === "center" ? payload.x + payload.width / 2 : payload.textAlign === "right" ? payload.x + payload.width : payload.x;
    if (payload.formats?.length) {
      type Glyph = { value: string; width: number; size: number; color: string };
      const lineHeight = Math.max(payload.fontSize, ...payload.formats.map((format) => format.fontSize ?? 0)) * 1.3;
      const lines: Array<{ glyphs: Glyph[]; width: number }> = [{ glyphs: [], width: 0 }];
      Array.from(payload.text).forEach((value, index) => {
        if (value === "\n") { lines.push({ glyphs: [], width: 0 }); return; }
        const format = [...payload.formats!].reverse().find((item) => index >= item.start && index < item.end);
        const size = format?.fontSize ?? payload.fontSize; context.font = fontFor(size); const width = context.measureText(value).width;
        let line = lines.at(-1)!;
        if (!payload.autoWidth && line.glyphs.length && line.width + width > payload.width) { line = { glyphs: [], width: 0 }; lines.push(line); }
        line.glyphs.push({ value, width, size, color: format?.color ?? payload.color }); line.width += width;
      });
      let y = payload.y;
      for (const line of lines) {
        if (y >= payload.y + payload.height) break;
        let x = payload.textAlign === "center" ? payload.x + (payload.width - line.width) / 2 : payload.textAlign === "right" ? payload.x + payload.width - line.width : payload.x;
        for (const glyph of line.glyphs) { context.font = fontFor(glyph.size); context.fillStyle = glyph.color; context.fillText(glyph.value, x, y); x += glyph.width; }
        y += lineHeight;
      }
      context.textAlign = "left";
      return;
    }
    context.font = fontFor(payload.fontSize);
    const lines = payload.autoWidth ? payload.text.split("\n") : wrapTextLines(payload.text, payload.width, (value) => context.measureText(value).width);
    lines.slice(0, Math.ceil(payload.height / (payload.fontSize * 1.3))).forEach((line, index) => context.fillText(line, textX, payload.y + index * payload.fontSize * 1.3));
    context.textAlign = "left";
    return;
  }
  if (object.kind === "rectangle" || object.kind === "ellipse" || object.kind === "star") {
    const payload = object.payload as ShapePayload;
    context.strokeStyle = payload.color; context.lineWidth = payload.strokeWidth;
    context.beginPath();
    if (object.kind === "rectangle") context.roundRect(payload.x, payload.y, payload.width, payload.height, 8);
    else if (object.kind === "ellipse") context.ellipse(payload.x + payload.width / 2, payload.y + payload.height / 2, payload.width / 2, payload.height / 2, 0, 0, Math.PI * 2);
    else starPath(context, payload);
    context.stroke(); return;
  }
  if (object.kind === "line" || object.kind === "arrow") {
    const payload = object.payload as LinePayload;
    context.strokeStyle = payload.color; context.fillStyle = payload.color; context.lineWidth = payload.strokeWidth; context.lineCap = "round";
    context.beginPath(); context.moveTo(payload.startX, payload.startY); context.lineTo(payload.endX, payload.endY); context.stroke();
    if (object.kind === "arrow") {
      const angle = Math.atan2(payload.endY - payload.startY, payload.endX - payload.startX);
      const size = 11 + payload.strokeWidth;
      context.beginPath(); context.moveTo(payload.endX, payload.endY);
      context.lineTo(payload.endX - Math.cos(angle - .45) * size, payload.endY - Math.sin(angle - .45) * size);
      context.lineTo(payload.endX - Math.cos(angle + .45) * size, payload.endY - Math.sin(angle + .45) * size); context.closePath(); context.fill();
    }
    return;
  }
  if (object.kind === "code") paintCode(context, object.payload as CodePayload);
  if (object.kind === "image") paintImage(context, object.payload as ImagePayload);
  if (object.kind === "task" && !(object.payload as TaskPayload).html) paintTask(context, object.payload as TaskPayload, backgroundColor);
  if (object.kind === "file") paintFile(context, object.payload as FilePayload);
}

export function paintObjects(context: CanvasRenderingContext2D, objects: Iterable<BoardObject>, options: RenderOptions) {
  const ratio = options.pixelRatio ?? 1;
  const orderedObjects = options.presorted ? Array.from(objects) : Array.from(objects).sort((a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt);
  context.setTransform(options.viewport.zoom * ratio, 0, 0, options.viewport.zoom * ratio, options.viewport.x * ratio, options.viewport.y * ratio);
  for (const object of orderedObjects) if (visible(object, options)) paintObject(context, object, options.backgroundColor);
  const selectedObjects = orderedObjects.filter((object) => options.selectedIds?.includes(object.id) || object.id === options.selectedId);
  for (const selected of selectedObjects) {
      context.strokeStyle = "#2f6fed"; context.lineWidth = 2 / options.viewport.zoom;
      context.strokeRect(selected.minX - 5, selected.minY - 5, selected.maxX - selected.minX + 10, selected.maxY - selected.minY + 10);
      if (selectedObjects.length === 1) {
      const radius = 5 / options.viewport.zoom;
      context.fillStyle = "#ffffff"; context.strokeStyle = "#2f6fed"; context.lineWidth = 2 / options.viewport.zoom;
      for (const point of selectionHandles(selected)) {
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill(); context.stroke();
      }
      }
  }
}
