"use client";

import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowRight, ArrowUp, Bold, Check, ChevronsDown, ChevronsUp, Circle, CircleHelp, Code2, Copy, Download, Eraser, Eye, Grid2X2, Hand,
  ImagePlus, Italic, Layers, Magnet, Map as MapIcon, Maximize2, Minus, MousePointer2, PenLine, Plus, Redo2, Search, Square, Star, Type, Undo2, Upload, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import RichHtml from "@/app/rich-html";
import type { BoardMutation } from "@/lib/boards/operations";
import type {
  BoardBounds, BoardObject, BoardObjectKind, BoardPermission, BoardSummary, CodePayload, FilePayload,
  LinePayload, ShapePayload, StrokePayload, TaskPayload, TextPayload,
} from "@/lib/boards/types";
import { detectCode } from "@/lib/boards/client/code-detection";
import { indentationAfterEnter } from "@/lib/boards/client/code-editor";
import { BoardCollaboration, type RemoteCursor, type RemoteStroke } from "@/lib/boards/client/collaboration";
import { eraserCanHit, eraserHitsObject, eraserPointHitsPath, type EraserMode } from "@/lib/boards/client/eraser";
import { PenEngine, outlinePath, strokeOutline } from "@/lib/boards/client/pen-engine";
import { BoardPersistence } from "@/lib/boards/client/persistence";
import { BoardObjectStore } from "@/lib/boards/client/object-store";
import { loadBoardHistory, saveBoardHistory, type BoardHistoryRecord } from "@/lib/boards/client/history-persistence";
import { paintBackground, paintObjects } from "@/lib/boards/client/renderer";
import { hitSelectionHandle, objectHitTest, objectIntersectsSelectionBox, resizeFromHandle, selectionAfterToolChange, type SelectionHandle } from "@/lib/boards/client/selection";
import { snapBounds, type AlignmentGuides } from "@/lib/boards/client/guides";
import { recognizeHeldStroke, resizeRecognizedShape, type RecognizedShape } from "@/lib/boards/client/shape-recognition";
import { constrainedShapePoint } from "@/lib/boards/client/geometry";
import { shiftTextFormats } from "@/lib/boards/client/text-formatting";
import { wrapTextLines } from "@/lib/boards/client/text-layout";
import { fitBounds, screenToWorld, worldToScreen, zoomAt, wheelZoomFactor, MIN_ZOOM, MAX_ZOOM, type BoardViewport } from "@/lib/boards/client/viewport";
import { taskDownloadHref, taskDownloadName } from "@/lib/task-download";

type ShapeTool = "rectangle" | "ellipse" | "star";
type Tool = "select" | "pan" | "pen" | "eraser" | "text" | ShapeTool | "line" | "arrow" | "code";
type SaveState = "saved" | "saving" | "offline";
type HistoryEntry = { record: BoardHistoryRecord; undo: () => void; redo: () => void };
type TextStyleValues = {
  color: string;
  fontFamily: "sans" | "mono" | "pribambas";
  fontSize: number;
  fontWeight: 500 | 700;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
};
type EditorDraft =
  | ({ kind: "text"; x: number; y: number; width: number; height: number; autoWidth: boolean; value: string; formats: NonNullable<TextPayload["formats"]>; objectId?: string } & TextStyleValues)
  | { kind: "code"; x: number; y: number; value: string; language: CodePayload["language"]; objectId?: string };
type PointerSession =
  | { type: "pen"; pointerId: number }
  | { type: "pan"; pointerId: number; startX: number; startY: number; viewport: BoardViewport }
  | { type: "move"; pointerId: number; startX: number; startY: number; originals: BoardObject[] }
  | { type: "resize"; pointerId: number; original: BoardObject; handle: SelectionHandle }
  | { type: "marquee"; pointerId: number; startX: number; startY: number; currentX: number; currentY: number; additive: boolean; initialIds: string[] }
  | { type: "text"; pointerId: number; startX: number; startY: number; currentX: number; currentY: number }
  | { type: "draw"; pointerId: number; startX: number; startY: number; objectId: string; kind: ShapeTool | "line" | "arrow" }
  | { type: "erase"; pointerId: number; points: Array<{ x: number; y: number }> }
  | null;

const BRAND_LIGHT = "#f5f0e4";
const BRAND_DARK = "#171613";
const COLORS = [BRAND_DARK, BRAND_LIGHT, "#2f6fed", "#de3c4b", "#1a936f", "#8b5cf6", "#f08c2e"];
const TEXT_STYLE_STORAGE_KEY = "egege-board-text-style-v1";
const SNAP_STORAGE_KEY = "egege-board-snap-v1";
const PEN_SIZE_STORAGE_KEY = "egege-board-pen-size-v1";
const VIEWPORT_STORAGE_PREFIX = "egege-board-viewport-v1:";
const RICH_OBJECT_KINDS = new Set<BoardObjectKind>(["task", "code"]);
const DEFAULT_TEXT_STYLE: TextStyleValues = { color: BRAND_DARK, fontFamily: "sans", fontSize: 28, fontWeight: 500, fontStyle: "normal", textAlign: "left" };

function textFontFamily(fontFamily: TextStyleValues["fontFamily"]) {
  return fontFamily === "pribambas" ? '"Pribambas", cursive'
    : fontFamily === "mono" ? '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}

function viewportBounds(viewport: BoardViewport, width: number, height: number, overscan = 0): BoardBounds {
  return {
    minX: (-viewport.x - overscan) / viewport.zoom,
    minY: (-viewport.y - overscan) / viewport.zoom,
    maxX: (width - viewport.x + overscan) / viewport.zoom,
    maxY: (height - viewport.y + overscan) / viewport.zoom,
  };
}

function autoTextSize(text: string, values: TextStyleValues) {
  const fallback = Math.max(44, Array.from(text).length * values.fontSize * .62 + 12);
  if (typeof document === "undefined") return { width: fallback, height: Math.max(44, text.split("\n").length * values.fontSize * 1.3) };
  const canvas = document.createElement("canvas"); const context = canvas.getContext("2d");
  if (!context) return { width: fallback, height: Math.max(44, text.split("\n").length * values.fontSize * 1.3) };
  context.font = `${values.fontStyle === "italic" ? "italic " : ""}${values.fontWeight} ${values.fontSize}px ${textFontFamily(values.fontFamily)}`;
  const width = Math.max(44, ...text.split("\n").map((line) => context.measureText(line).width + 12));
  return { width: Math.min(100_000, Math.ceil(width)), height: Math.max(44, text.split("\n").length * values.fontSize * 1.3) };
}

function fittedTextSize(text: string, values: TextStyleValues, maxWidth?: number) {
  if (typeof document === "undefined") return autoTextSize(text, values);
  const canvas = document.createElement("canvas"); const context = canvas.getContext("2d"); if (!context) return autoTextSize(text, values);
  context.font = `${values.fontStyle === "italic" ? "italic " : ""}${values.fontWeight} ${values.fontSize}px ${textFontFamily(values.fontFamily)}`;
  const lines = maxWidth ? wrapTextLines(text, Math.max(20, maxWidth - 12), (value) => context.measureText(value).width) : text.split("\n");
  const width = Math.max(44, ...lines.map((line) => context.measureText(line).width + 12));
  return { width: Math.min(maxWidth ?? 100_000, Math.ceil(width)), height: Math.max(44, Math.ceil(lines.length * values.fontSize * 1.3)) };
}

function formattedTextPreview(text: string, formats: NonNullable<TextPayload["formats"]>, zoom: number) {
  const boundaries = Array.from(new Set([0, text.length, ...formats.flatMap((format) => [Math.max(0, format.start), Math.min(text.length, format.end)])])).sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const format = [...formats].reverse().find((item) => start >= item.start && start < item.end);
    return <span style={{ color: format?.color, fontSize: format?.fontSize ? format.fontSize * zoom : undefined }} key={`${start}:${end}`}>{text.slice(start, end)}</span>;
  });
}

async function imageResponseAsPng(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  if (!response.ok) throw new Error("image-fetch-failed");
  const source = await response.blob();
  if (source.type === "image/png") return source;
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("image-conversion-failed");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image-conversion-failed")), "image/png"));
  } finally { bitmap.close(); }
}

function TextFormattingToolbar({ values, onChange, className = "" }: { values: TextStyleValues; onChange: (patch: Partial<TextStyleValues>) => void; className?: string }) {
  const fontSize = Math.max(1, Math.min(160, Math.round(values.fontSize)));
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));
  const fontSizeFocused = useRef(false);
  useEffect(() => { if (!fontSizeFocused.current) setFontSizeInput(String(fontSize)); }, [fontSize]);
  const confirmFontSize = () => {
    const parsed = Number(fontSizeInput);
    const next = fontSizeInput.trim() && Number.isFinite(parsed) ? Math.max(1, Math.min(160, Math.round(parsed))) : 10;
    setFontSizeInput(String(next)); onChange({ fontSize: next });
  };
  return <div className={`board-text-formatting ${className}`} role="toolbar" aria-label="Форматирование текста" onPointerDown={(event) => { event.stopPropagation(); if ((event.target as HTMLElement).closest("button")) event.preventDefault(); }}>
    <select value={values.fontFamily} onChange={(event) => onChange({ fontFamily: event.target.value as TextStyleValues["fontFamily"] })} aria-label="Шрифт">
      <option value="sans">Sans</option><option value="mono">Mono</option><option value="pribambas">Pribambas</option>
    </select>
    <div className="board-text-size"><button type="button" onClick={() => onChange({ fontSize: Math.max(1, fontSize - 2) })} aria-label="Уменьшить текст"><Minus /></button><input type="number" min="1" max="160" value={fontSizeInput} onFocus={() => { fontSizeFocused.current = true; }} onChange={(event) => { const next = event.target.value; setFontSizeInput(next); const parsed = Number(next); if (next.trim() && Number.isFinite(parsed) && parsed >= 1 && parsed <= 160) onChange({ fontSize: Math.round(parsed) }); }} onBlur={() => { fontSizeFocused.current = false; confirmFontSize(); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} aria-label="Размер текста" /><button type="button" onClick={() => onChange({ fontSize: Math.min(160, fontSize + 2) })} aria-label="Увеличить текст"><Plus /></button></div>
    <button type="button" className={values.fontWeight === 700 ? "is-active" : ""} onClick={() => onChange({ fontWeight: values.fontWeight === 700 ? 500 : 700 })} aria-label="Жирный"><Bold /></button>
    <button type="button" className={values.fontStyle === "italic" ? "is-active" : ""} onClick={() => onChange({ fontStyle: values.fontStyle === "italic" ? "normal" : "italic" })} aria-label="Курсив"><Italic /></button>
    <i />
    {(["left", "center", "right"] as const).map((align) => <button type="button" className={values.textAlign === align ? "is-active" : ""} onClick={() => onChange({ textAlign: align })} aria-label={align === "left" ? "По левому краю" : align === "center" ? "По центру" : "По правому краю"} key={align}>{align === "left" ? <AlignLeft /> : align === "center" ? <AlignCenter /> : <AlignRight />}</button>)}
    <i />
    <div className="board-text-colors">{COLORS.map((item) => <button type="button" key={item} className={values.color === item ? "is-active" : ""} style={{ background: item }} onClick={() => onChange({ color: item })} aria-label={`Цвет текста ${item}`} />)}</div>
  </div>;
}

const BOARD_SHORTCUTS = [
  ["V", "Выбор"], ["H", "Полотно"], ["P", "Перо"], ["E", "Ластик"], ["T", "Текст"],
  ["R", "Прямоугольник"], ["O", "Эллипс"], ["L", "Линия"], ["A", "Стрелка"], ["C", "Блок кода"],
  ["Space", "Временно двигать холст"], ["Ctrl/⌘ Z", "Отменить"], ["Ctrl/⌘ Shift Z", "Повторить"],
  ["Ctrl/⌘ A", "Выделить всё"], ["Ctrl/⌘ C · X · V", "Копировать · вырезать · вставить"], ["Ctrl/⌘ D", "Дублировать"], ["Delete", "Удалить выбранное"],
  ["← ↑ → ↓", "Сдвинуть на 1 px"], ["Shift + стрелки", "Сдвинуть на 10 px"], ["Numpad + / −", "Масштаб"], ["Esc", "Снять выделение"],
] as const;

function BoardHelp({ onClose }: { onClose: () => void }) {
  return <div className="board-help-layer" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <section className="board-help" role="dialog" aria-modal="true" aria-labelledby="board-help-title">
      <button className="board-help-close" onClick={onClose} aria-label="Закрыть справку"><X /></button><span>Справка</span><h2 id="board-help-title">Как пользоваться доской</h2>
      <div className="board-help-grid"><article><h3>Инструменты</h3><p><b>Выбор</b><small>Перемещайте и меняйте размер объектов. Двойной клик открывает текст или код.</small></p><p><b>Перо и ластик</b><small>Обычный ластик стирает только рукопись. Для картинок, фигур и текста есть режим «Объекты».</small></p><p><b>Текст, фигуры и код</b><small>Выберите инструмент, затем нажмите или протяните на холсте.</small></p></article><article><h3>Управление</h3><p><b>Полотно</b><small>Перетаскивайте рукой или удерживайте Space. Два пальца перемещают, щипок меняет масштаб.</small></p><p><b>Вставка</b><small>Вставьте изображение из буфера или перетащите файл. Код из буфера распознаётся автоматически.</small></p><p><b>Сохранение</b><small>Все изменения сохраняются автоматически.</small></p></article></div>
      <article className="board-help-shortcuts"><h3>Горячие клавиши</h3><div>{BOARD_SHORTCUTS.map(([key, label]) => <p key={key}><kbd>{key}</kbd><small>{label}</small></p>)}</div></article>
    </section>
  </div>;
}

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes); crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function newObjectId() { return `obj_${randomHex(12)}`; }
function newOperationId() { return `op_${crypto.randomUUID()}`; }

function cloneObject(object: BoardObject): BoardObject {
  return structuredClone(object);
}

function objectBounds(objects: Iterable<BoardObject>): BoardBounds | null {
  let result: BoardBounds | null = null;
  for (const object of objects) result = result ? {
    minX: Math.min(result.minX, object.minX), minY: Math.min(result.minY, object.minY),
    maxX: Math.max(result.maxX, object.maxX), maxY: Math.max(result.maxY, object.maxY),
  } : { minX: object.minX, minY: object.minY, maxX: object.maxX, maxY: object.maxY };
  return result;
}

function translated(object: BoardObject, dx: number, dy: number): BoardObject {
  const next = cloneObject(object);
  next.minX += dx; next.maxX += dx; next.minY += dy; next.maxY += dy;
  if (next.kind === "stroke") {
    (next.payload as StrokePayload).points.forEach((point) => { point.x += dx; point.y += dy; });
  } else if (next.kind === "text") {
    const payload = next.payload as TextPayload; payload.x += dx; payload.y += dy;
  } else if (next.kind === "rectangle" || next.kind === "ellipse" || next.kind === "star") {
    const payload = next.payload as ShapePayload; payload.x += dx; payload.y += dy;
  } else if (next.kind === "line" || next.kind === "arrow") {
    const payload = next.payload as LinePayload; payload.startX += dx; payload.endX += dx; payload.startY += dy; payload.endY += dy;
  } else {
    const payload = next.payload as CodePayload & { x: number; y: number }; payload.x += dx; payload.y += dy;
  }
  next.updatedAt = Math.floor(Date.now() / 1000);
  return next;
}

export default function BoardSurface({
  board, permission, owner, shareToken, participantName, onBackground, onRemoteBackground,
}: { board: BoardSummary; permission: BoardPermission; owner: boolean; shareToken: string; participantName: string; onBackground: (type: BoardSummary["backgroundType"], color: string) => void; onRemoteBackground: (type: BoardSummary["backgroundType"], color: string) => void }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLCanvasElement | null>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const liveRef = useRef<HTMLCanvasElement | null>(null);
  const taskLayerRef = useRef<HTMLDivElement | null>(null);
  const cursorLayerRef = useRef<HTMLDivElement | null>(null);
  const objectsRef = useRef(new BoardObjectStore());
  const viewportRef = useRef<BoardViewport>({ x: 0, y: 0, zoom: 1 });
  const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });
  const boardAppearanceRef = useRef({ backgroundType: board.backgroundType, backgroundColor: board.backgroundColor });
  const selectedRef = useRef("");
  const pointerSession = useRef<PointerSession>(null);
  const penEngine = useRef(new PenEngine());
  const persistenceRef = useRef<BoardPersistence | null>(null);
  const collaborationRef = useRef<BoardCollaboration | null>(null);
  const remoteStrokes = useRef(new Map<string, RemoteStroke>());
  const remoteCursorsRef = useRef<Record<string, RemoteCursor>>({});
  const liveStrokeId = useRef("");
  const lastStrokePointSent = useRef(0);
  const shapeRecognitionTimer = useRef(0);
  const recognizedShape = useRef<RecognizedShape | null>(null);
  const recognizedBaseShape = useRef<RecognizedShape | null>(null);
  const recognizedAtPoint = useRef<{ x: number; y: number } | null>(null);
  const cursorFrame = useRef(0);
  const lastCursorSentAt = useRef(0);
  const renderFrame = useRef(0);
  const viewportSaveTimer = useRef(0);
  const scheduledViewportSignature = useRef("");
  const spacePressed = useRef(false);
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const clientIdRef = useRef("");
  const clipboardObjects = useRef<BoardObject[]>([]);
  const lastPointerScreen = useRef<{ x: number; y: number } | null>(null);
  const selectedIdsRef = useRef(new Set<string>());
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const eraserCursorRef = useRef<HTMLDivElement | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const pinchState = useRef<{ distance: number; viewport: BoardViewport; center: { x: number; y: number } } | null>(null);
  const gestureScale = useRef(1);
  const [tool, setTool] = useState<Tool>(permission === "edit" ? "pen" : "pan");
  const [color, setColor] = useState(board.backgroundColor === BRAND_DARK ? BRAND_LIGHT : BRAND_DARK);
  const [textDefaults, setTextDefaults] = useState<TextStyleValues>({ ...DEFAULT_TEXT_STYLE, color: board.backgroundColor === BRAND_DARK ? BRAND_LIGHT : BRAND_DARK });
  const [penSize, setPenSize] = useState(5);
  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [shapeTool, setShapeTool] = useState<ShapeTool>("rectangle");
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [taskAnswersOpen, setTaskAnswersOpen] = useState<Set<string>>(() => new Set());
  const [saveState, setSaveState] = useState<SaveState>("saving");
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 5300);
    return () => window.clearTimeout(timer);
  }, [message]);
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const copiedCodeTimer = useRef(0);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const minimapViewportRef = useRef<BoardViewport>({ x: 0, y: 0, zoom: 1 });
  const minimapDragRef = useRef<BoardViewport | null>(null);
  const [zoomLabel, setZoomLabel] = useState(100);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [taskTextSelectionId, setTaskTextSelectionId] = useState("");
  const [objectRevision, setObjectRevision] = useState(0);
  const [visibleRichObjectIds, setVisibleRichObjectIds] = useState<string[]>([]);
  const visibleRichSignature = useRef("");
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({});
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [, setSelectionRevision] = useState(0);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [participants, setParticipants] = useState<Array<{ clientId: string; name: string }>>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [realtimeState, setRealtimeState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [phoneReadOnly, setPhoneReadOnly] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskSearching, setTaskSearching] = useState(false);
  const [pasteSuggestion, setPasteSuggestion] = useState<{ text: string; x: number; y: number } | null>(null);
  const [editorDraft, setEditorDraft] = useState<EditorDraft | null>(null);
  const autoSelectedTextObject = useRef("");
  const canEdit = permission === "edit" && !phoneReadOnly;
  const viewportStorageKey = `${VIEWPORT_STORAGE_PREFIX}${board.id}`;
  const persistViewport = useCallback(() => {
    window.clearTimeout(viewportSaveTimer.current);
    try { window.localStorage.setItem(viewportStorageKey, JSON.stringify(viewportRef.current)); } catch { /* Доска работает без localStorage. */ }
  }, [viewportStorageKey]);
  const scheduleViewportPersistence = useCallback(() => {
    const viewport = viewportRef.current;
    const signature = `${viewport.x}:${viewport.y}:${viewport.zoom}`;
    if (signature === scheduledViewportSignature.current) return;
    scheduledViewportSignature.current = signature;
    window.clearTimeout(viewportSaveTimer.current);
    viewportSaveTimer.current = window.setTimeout(persistViewport, 140);
  }, [persistViewport]);

  boardAppearanceRef.current = { backgroundType: board.backgroundType, backgroundColor: board.backgroundColor };

  useEffect(() => {
    setSnapEnabled(window.localStorage.getItem(SNAP_STORAGE_KEY) !== "off");
    const storedPenSize = window.localStorage.getItem(PEN_SIZE_STORAGE_KEY);
    const savedPenSize = Number(storedPenSize);
    if (storedPenSize !== null && Number.isFinite(savedPenSize)) setPenSize(Math.max(2, Math.min(24, savedPenSize)));
  }, []);

  useEffect(() => () => window.clearTimeout(copiedCodeTimer.current), []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(viewportStorageKey) || "null") as Partial<BoardViewport> | null;
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom)) {
        viewportRef.current = { x: Number(saved.x), y: Number(saved.y), zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(saved.zoom))) };
        setZoomLabel(Math.round(viewportRef.current.zoom * 100));
      }
    } catch { /* Повреждённая локальная позиция не мешает открыть доску. */ }
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") persistViewport(); };
    window.addEventListener("pagehide", persistViewport);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", persistViewport);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      persistViewport();
    };
  }, [persistViewport, viewportStorageKey]);

  useEffect(() => {
    if (editorDraft?.kind !== "text" || !editorDraft.objectId) { autoSelectedTextObject.current = ""; return; }
    if (autoSelectedTextObject.current === editorDraft.objectId) return;
    autoSelectedTextObject.current = editorDraft.objectId;
    const frame = window.requestAnimationFrame(() => { textEditorRef.current?.focus(); textEditorRef.current?.select(); });
    return () => window.cancelAnimationFrame(frame);
  }, [editorDraft]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 620px)"); const sync = () => setPhoneReadOnly(query.matches); sync();
    query.addEventListener("change", sync); return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(TEXT_STYLE_STORAGE_KEY) || "{}") as Partial<TextStyleValues>;
      setTextDefaults({
        color: typeof saved.color === "string" && /^#[a-f\d]{6}$/i.test(saved.color) ? saved.color : board.backgroundColor === BRAND_DARK ? BRAND_LIGHT : BRAND_DARK,
        fontFamily: saved.fontFamily === "mono" || saved.fontFamily === "pribambas" ? saved.fontFamily : "sans",
        fontSize: Math.max(1, Math.min(160, Number(saved.fontSize) || DEFAULT_TEXT_STYLE.fontSize)),
        fontWeight: saved.fontWeight === 700 ? 700 : 500,
        fontStyle: saved.fontStyle === "italic" ? "italic" : "normal",
        textAlign: saved.textAlign === "center" || saved.textAlign === "right" ? saved.textAlign : "left",
      });
    } catch { /* Повреждённая локальная настройка не мешает открыть доску. */ }
  }, [board.backgroundColor]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setColor((current) => current === board.backgroundColor
      ? board.backgroundColor === BRAND_DARK ? BRAND_LIGHT : BRAND_DARK
      : current));
    return () => window.cancelAnimationFrame(frame);
  }, [board.backgroundColor]);

  const scheduleRender = useCallback((includeCommitted = true) => {
    scheduleViewportPersistence();
    window.cancelAnimationFrame(renderFrame.current);
    renderFrame.current = window.requestAnimationFrame(() => {
      const size = sizeRef.current;
      const viewport = viewportRef.current;
      const appearance = boardAppearanceRef.current;
      const options = {
        ...size, viewport, background: appearance.backgroundType, backgroundColor: appearance.backgroundColor,
        selectedId: selectedRef.current, selectedIds: Array.from(selectedIdsRef.current), pixelRatio: size.ratio,
      };
      const nextRichObjectIds = objectsRef.current.visible(viewportBounds(viewport, size.width, size.height, 320), RICH_OBJECT_KINDS).map((object) => object.id);
      const nextRichSignature = nextRichObjectIds.join("\0");
      if (nextRichSignature !== visibleRichSignature.current) {
        visibleRichSignature.current = nextRichSignature; setVisibleRichObjectIds(nextRichObjectIds);
      }
      const background = backgroundRef.current?.getContext("2d");
      if (background) paintBackground(background, options);
      if (includeCommitted) {
        const committed = committedRef.current?.getContext("2d");
        if (committed) {
          committed.setTransform(1, 0, 0, 1, 0, 0);
          committed.clearRect(0, 0, committed.canvas.width, committed.canvas.height);
          paintObjects(committed, objectsRef.current.visible(viewportBounds(viewport, size.width, size.height)), { ...options, presorted: true });
        }
      }
      const minimap = minimapRef.current?.getContext("2d");
      if (minimap) {
        const width = 240; const height = 160;
        const visible = { minX: -viewport.x / viewport.zoom, minY: -viewport.y / viewport.zoom,
          maxX: (size.width - viewport.x) / viewport.zoom, maxY: (size.height - viewport.y) / viewport.zoom };
        const content = objectBounds(objectsRef.current.values()) ?? visible;
        const bounds = { minX: Math.min(content.minX, visible.minX), minY: Math.min(content.minY, visible.minY),
          maxX: Math.max(content.maxX, visible.maxX), maxY: Math.max(content.maxY, visible.maxY) };
        const scale = Math.min((width - 24) / Math.max(1, bounds.maxX - bounds.minX), (height - 24) / Math.max(1, bounds.maxY - bounds.minY));
        const mapViewport = minimapDragRef.current ?? { x: width / 2 - (bounds.minX + bounds.maxX) / 2 * scale,
          y: height / 2 - (bounds.minY + bounds.maxY) / 2 * scale, zoom: scale };
        minimapViewportRef.current = mapViewport;
        minimap.setTransform(1, 0, 0, 1, 0, 0);
        minimap.clearRect(0, 0, width * 2, height * 2);
        minimap.fillStyle = appearance.backgroundColor; minimap.fillRect(0, 0, width * 2, height * 2);
        const mapObjects = objectsRef.current.sorted().map((object) => object.kind === "task"
          ? { ...object, payload: { ...object.payload, html: "" } } as BoardObject : object);
        paintObjects(minimap, mapObjects, { ...options, width, height, viewport: mapViewport, selectedId: undefined, selectedIds: [], pixelRatio: 2, presorted: true });
        minimap.setTransform(2, 0, 0, 2, 0, 0);
        const left = visible.minX * mapViewport.zoom + mapViewport.x; const top = visible.minY * mapViewport.zoom + mapViewport.y;
        const viewWidth = (visible.maxX - visible.minX) * mapViewport.zoom; const viewHeight = (visible.maxY - visible.minY) * mapViewport.zoom;
        minimap.fillStyle = "rgba(47,111,237,.12)"; minimap.fillRect(left, top, viewWidth, viewHeight);
        minimap.strokeStyle = "#2f6fed"; minimap.lineWidth = 1.5; minimap.strokeRect(left, top, viewWidth, viewHeight);
      }
      syncTaskDom();
      syncRemoteCursorDom();
    });
  }, [scheduleViewportPersistence]);

  useEffect(() => { if (minimapOpen) scheduleRender(); }, [minimapOpen, scheduleRender]);

  function navigateMinimap(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = screenToWorld({ x: (event.clientX - rect.left) * 240 / rect.width, y: (event.clientY - rect.top) * 160 / rect.height }, minimapDragRef.current ?? minimapViewportRef.current);
    const viewport = viewportRef.current; const size = sizeRef.current;
    viewportRef.current = { ...viewport, x: size.width / 2 - point.x * viewport.zoom, y: size.height / 2 - point.y * viewport.zoom };
    scheduleRender();
  }

  const paintLiveStroke = useCallback(() => {
    const canvas = liveRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    const { ratio } = sizeRef.current;
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
    const viewport = viewportRef.current;
    context.setTransform(viewport.zoom * ratio, 0, 0, viewport.zoom * ratio, viewport.x * ratio, viewport.y * ratio);
    if (pointerSession.current?.type === "pen") {
      const shape = recognizedShape.current;
      if (shape) {
        context.strokeStyle = color; context.lineWidth = Math.max(2, penSize); context.lineCap = "round"; context.lineJoin = "round"; context.beginPath();
        if (shape.kind === "line") { context.moveTo(shape.startX, shape.startY); context.lineTo(shape.endX, shape.endY); }
        else if (shape.kind === "rectangle") context.roundRect(shape.x, shape.y, shape.width, shape.height, Math.min(8, shape.width / 8, shape.height / 8));
        else context.ellipse(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.fillStyle = color;
        context.fill(outlinePath(strokeOutline(penEngine.current.value(), penSize)));
      }
    }
    for (const stroke of remoteStrokes.current.values()) {
      context.fillStyle = stroke.color;
      const points = stroke.points.map((point, index) => ({ x: point[0], y: point[1], pressure: point[2], time: index }));
      context.fill(outlinePath(strokeOutline(points, stroke.size)));
    }
  }, [color, penSize]);

  const armShapeRecognition = useCallback(() => {
    window.clearTimeout(shapeRecognitionTimer.current);
    shapeRecognitionTimer.current = window.setTimeout(() => {
      if (pointerSession.current?.type !== "pen") return;
      const shape = recognizeHeldStroke(penEngine.current.value());
      if (!shape) return;
      recognizedShape.current = shape;
      recognizedBaseShape.current = structuredClone(shape);
      const last = penEngine.current.value().at(-1); recognizedAtPoint.current = last ? { x: last.x, y: last.y } : null;
      collaborationRef.current?.endStroke(liveStrokeId.current);
      paintLiveStroke();
    }, 560);
  }, [paintLiveStroke]);

  useEffect(() => () => window.clearTimeout(shapeRecognitionTimer.current), []);

  const resize = useCallback(() => {
    const shell = shellRef.current; if (!shell) return;
    const rect = shell.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    sizeRef.current = { width: rect.width, height: rect.height, ratio };
    for (const canvas of [backgroundRef.current, committedRef.current, liveRef.current]) if (canvas) {
      canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio));
    }
    if (viewportRef.current.x === 0 && viewportRef.current.y === 0) viewportRef.current = { x: rect.width / 2, y: rect.height / 2, zoom: 1 };
    scheduleRender();
  }, [scheduleRender]);

  useEffect(() => { scheduleRender(); }, [scheduleRender, board.backgroundColor, board.backgroundType]);

  useEffect(() => {
    let cancelled = false;
    if (typeof document.fonts?.load !== "function") return;
    void document.fonts.load('28px "Pribambas"').then(() => { if (!cancelled) scheduleRender(); });
    return () => { cancelled = true; };
  }, [scheduleRender]);

  useEffect(() => {
    const shell = shellRef.current; if (!shell) return;
    const observer = new ResizeObserver(resize); observer.observe(shell); resize();
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    const shell = shellRef.current; if (!shell) return;
    type NativeGestureEvent = Event & { scale?: number; clientX?: number; clientY?: number };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = shell.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const pageScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, sizeRef.current.height) : 1;
      const deltaX = event.deltaX * pageScale; const deltaY = event.deltaY * pageScale;
      if (event.ctrlKey || event.metaKey) {
        viewportRef.current = zoomAt(viewportRef.current, point, wheelZoomFactor(deltaY, event.shiftKey));
        setZoomLabel(Math.round(viewportRef.current.zoom * 100));
      } else {
        viewportRef.current = {
          ...viewportRef.current,
          x: viewportRef.current.x - deltaX,
          y: viewportRef.current.y - deltaY,
        };
      }
      scheduleRender();
    };
    const start = (event: Event) => { event.preventDefault(); gestureScale.current = 1; };
    const change = (event: Event) => {
      event.preventDefault();
      const gesture = event as NativeGestureEvent; const nextScale = Math.max(.1, Number(gesture.scale) || 1);
      const rect = shell.getBoundingClientRect();
      const point = {
        x: typeof gesture.clientX === "number" ? gesture.clientX - rect.left : rect.width / 2,
        y: typeof gesture.clientY === "number" ? gesture.clientY - rect.top : rect.height / 2,
      };
      viewportRef.current = zoomAt(viewportRef.current, point, nextScale / gestureScale.current);
      gestureScale.current = nextScale; setZoomLabel(Math.round(viewportRef.current.zoom * 100)); scheduleRender();
    };
    const end = (event: Event) => { event.preventDefault(); gestureScale.current = 1; };
    shell.addEventListener("wheel", wheel, { passive: false, capture: true });
    shell.addEventListener("gesturestart", start, { passive: false });
    shell.addEventListener("gesturechange", change, { passive: false });
    shell.addEventListener("gestureend", end, { passive: false });
    return () => {
      shell.removeEventListener("wheel", wheel, { capture: true });
      shell.removeEventListener("gesturestart", start); shell.removeEventListener("gesturechange", change); shell.removeEventListener("gestureend", end);
    };
  }, [scheduleRender]);

  useEffect(() => {
    const loaded = () => scheduleRender();
    window.addEventListener("board-image-loaded", loaded);
    return () => window.removeEventListener("board-image-loaded", loaded);
  }, [scheduleRender]);

  useEffect(() => {
    const storedClientId = window.sessionStorage.getItem("egege-board-client-id") ?? "";
    const clientId = /^cli_[a-f0-9]{24}$/.test(storedClientId) ? storedClientId : `cli_${randomHex(12)}`;
    window.sessionStorage.setItem("egege-board-client-id", clientId);
    clientIdRef.current = clientId;
    const persistence = new BoardPersistence(board.id, shareToken, clientId, (state, pending) => {
      setSaveState(state); setPendingCount(pending);
    });
    persistenceRef.current = persistence;
    Promise.all([persistence.load(), loadBoardHistory(board.id, clientId).catch(() => ({ undo: [], redo: [] }))]).then(([{ objects }, history]) => {
      objectsRef.current = new BoardObjectStore(objects);
      undoStack.current = history.undo.map(historyEntry);
      redoStack.current = history.redo.map(historyEntry);
      updateHistory(false);
      setLoading(false); scheduleRender(); void hydrateExistingTaskImages(objects);
    }).catch((error) => { setLoading(false); setMessage(error instanceof Error ? error.message : "Не удалось загрузить доску"); });
    const online = () => { setSaveState("saving"); void persistence.flush(); };
    const offline = () => setSaveState("offline");
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    const collaboration = new BoardCollaboration(board.id, shareToken, participantName, clientId, (event) => {
      if (event.type === "state") setRealtimeState(event.state);
      else if (event.type === "participants") setParticipants(event.participants);
      else if (event.type === "cursor") setRemoteCursors((current) => {
        const next = { ...current, [event.cursor.clientId]: event.cursor }; remoteCursorsRef.current = next; return next;
      });
      else if (event.type === "stroke") {
        const current = remoteStrokes.current.get(event.stroke.strokeId);
        remoteStrokes.current.set(event.stroke.strokeId, { ...event.stroke, points: [...(current?.points ?? []), ...event.stroke.points].slice(-4000) });
        paintLiveStroke();
      } else if (event.type === "stroke-end") { remoteStrokes.current.delete(event.strokeId); paintLiveStroke(); }
      else if (event.type === "operation-ack") { void persistence.acknowledge(event.operationId); }
      else if (event.type === "operation") {
        if (event.operation.type === "delete") objectsRef.current.delete(event.operation.objectId);
        else if (event.operation.object) objectsRef.current.set(event.operation.object.id, event.operation.object);
        setObjectRevision((value) => value + 1);
        scheduleRender();
      } else if (event.type === "background") {
        onRemoteBackground(event.backgroundType, event.backgroundColor);
      } else if (event.type === "error") setMessage(event.message);
    });
    collaborationRef.current = collaboration; void collaboration.connect();
    return () => { persistence.dispose(); collaboration.stop(); window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [board.id, onRemoteBackground, paintLiveStroke, participantName, scheduleRender, shareToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setRemoteCursors((current) => {
      const now = Date.now(); const next = Object.fromEntries(Object.entries(current).filter(([, cursor]) => now - cursor.at < 5000));
      remoteCursorsRef.current = next; return Object.keys(next).length === Object.keys(current).length ? current : next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { scheduleRender(); }, [remoteCursors, scheduleRender]);

  function setSelections(ids: Iterable<string>, primary = "") {
    const valid = Array.from(new Set(ids)).filter((id) => objectsRef.current.has(id));
    selectedIdsRef.current = new Set(valid); selectedRef.current = primary && valid.includes(primary) ? primary : valid.at(-1) ?? "";
    setSelectedIdsState(valid); setSelectedId(selectedRef.current); scheduleRender();
    if (!valid.includes(taskTextSelectionId)) setTaskTextSelectionId("");
  }
  function syncTaskDom() {
    const layer = shellRef.current; if (!layer) return; const viewport = viewportRef.current;
    for (const node of layer.querySelectorAll<HTMLElement>("[data-board-task-id], [data-board-code-id]")) {
      const object = objectsRef.current.get(node.dataset.boardTaskId ?? node.dataset.boardCodeId ?? ""); if (!object || (object.kind !== "task" && object.kind !== "code")) continue;
      const payload = object.payload as TaskPayload | CodePayload; node.style.width = `${payload.width}px`; node.style.height = `${object.kind === "code" ? 48 : payload.height}px`;
      node.style.setProperty("--board-task-font-scale", String(payload.fontScale ?? 1));
      node.style.transform = `translate(${payload.x * viewport.zoom + viewport.x}px, ${payload.y * viewport.zoom + viewport.y}px) scale(${viewport.zoom})`;
    }
  }
  function syncRemoteCursorDom() {
    const layer = cursorLayerRef.current; if (!layer) return; const viewport = viewportRef.current;
    for (const node of layer.querySelectorAll<HTMLElement>("[data-board-cursor-id]")) {
      const cursor = remoteCursorsRef.current[node.dataset.boardCursorId ?? ""]; if (!cursor) continue;
      const left = cursor.x * viewport.zoom + viewport.x; const top = cursor.y * viewport.zoom + viewport.y;
      node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    }
  }
  function setSelection(id: string) { setSelections(id ? [id] : [], id); }
  function chooseTool(nextTool: Tool) {
    const nextSelection = selectionAfterToolChange(selectedRef.current, nextTool);
    if (nextSelection !== selectedRef.current) setSelection(nextSelection);
    setTool(nextTool);
  }
  function changePenSize(next: number) {
    const value = Math.max(2, Math.min(24, next)); setPenSize(value);
    try { window.localStorage.setItem(PEN_SIZE_STORAGE_KEY, String(value)); } catch { /* Перо работает без localStorage. */ }
  }
  function historyEntry(record: BoardHistoryRecord): HistoryEntry {
    if (record.kind === "create") return {
      record, undo: () => applyDelete(record.object.id, false), redo: () => applyCreate(cloneObject(record.object), false),
    };
    if (record.kind === "update") return {
      record, undo: () => applyUpdate(record.after, cloneObject(record.before), false), redo: () => applyUpdate(record.before, cloneObject(record.after), false),
    };
    return { record, undo: () => applyCreate(cloneObject(record.object), false), redo: () => applyDelete(record.object.id, false) };
  }
  function updateHistory(save = true) {
    undoStack.current = undoStack.current.slice(-40); redoStack.current = redoStack.current.slice(-40);
    setHistoryState({ undo: undoStack.current.length, redo: redoStack.current.length });
    if (save && clientIdRef.current) void saveBoardHistory(board.id, clientIdRef.current, {
      undo: undoStack.current.map((entry) => entry.record), redo: redoStack.current.map((entry) => entry.record),
    }).catch(() => { /* Отмена продолжает работать в текущей вкладке без IndexedDB. */ });
  }
  function submit(mutation: BoardMutation) { collaborationRef.current?.sendOperation(mutation); void persistenceRef.current?.submit(mutation); }

  function applyCreate(object: BoardObject, record = true) {
    objectsRef.current.set(object.id, object); scheduleRender();
    setObjectRevision((value) => value + 1);
    submit({ id: newOperationId(), type: "create", object });
    if (record) {
      undoStack.current.push(historyEntry({ kind: "create", object: cloneObject(object) }));
      redoStack.current = []; updateHistory();
    }
  }

  function applyUpdate(before: BoardObject, after: BoardObject, record = true) {
    objectsRef.current.set(after.id, after); scheduleRender();
    setObjectRevision((value) => value + 1);
    submit({ id: newOperationId(), type: "update", objectId: after.id, object: after });
    if (record) {
      undoStack.current.push(historyEntry({ kind: "update", before: cloneObject(before), after: cloneObject(after) }));
      redoStack.current = []; updateHistory();
    }
  }

  function applyDelete(id: string, record = true) {
    const object = objectsRef.current.get(id); if (!object) return;
    objectsRef.current.delete(id); if (selectedRef.current === id) setSelection(""); else scheduleRender();
    setObjectRevision((value) => value + 1);
    submit({ id: newOperationId(), type: "delete", objectId: id });
    if (record) {
      undoStack.current.push(historyEntry({ kind: "delete", object: cloneObject(object) }));
      redoStack.current = []; updateHistory();
    }
  }

  function makeObject(kind: BoardObjectKind, payload: BoardObject["payload"], bounds: BoardBounds) {
    const now = Math.floor(Date.now() / 1000);
    const zIndex = objectsRef.current.maxZIndex() + 1;
    return { id: newObjectId(), kind, version: 1, zIndex, ...bounds, payload, createdBy: participantName, createdAt: now, updatedAt: now } as BoardObject;
  }

  function createObject(kind: BoardObjectKind, payload: BoardObject["payload"], bounds: BoardBounds) {
    const object = makeObject(kind, payload, bounds);
    applyCreate(object); return object;
  }

  function drawnObject(kind: ShapeTool | "line" | "arrow", startX: number, startY: number, endX: number, endY: number, id?: string) {
    const minX = Math.min(startX, endX); const minY = Math.min(startY, endY);
    const maxX = Math.max(startX, endX); const maxY = Math.max(startY, endY);
    const object = kind === "line" || kind === "arrow"
      ? makeObject(kind, { color, strokeWidth: 3, startX, startY, endX, endY }, { minX: minX - 3, minY: minY - 3, maxX: maxX + 3, maxY: maxY + 3 })
      : makeObject(kind, { color, strokeWidth: 3, x: minX, y: minY, width: maxX - minX, height: maxY - minY }, { minX, minY, maxX, maxY });
    if (id) object.id = id;
    return object;
  }

  function localPoint(event: { clientX: number; clientY: number }) {
    const rect = shellRef.current!.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pasteScreenPoint(width: number, height: number) {
    const size = sizeRef.current;
    const preferred = lastPointerScreen.current ?? { x: size.width / 2, y: size.height / 2 };
    const margin = 24;
    return {
      x: Math.max(margin, Math.min(size.width - Math.min(width, size.width - margin * 2) - margin, preferred.x + 18)),
      y: Math.max(110, Math.min(size.height - Math.min(height, size.height - 134) - margin, preferred.y + 18)),
    };
  }

  function worldPoint(event: PointerEvent | React.PointerEvent) { return screenToWorld(localPoint(event), viewportRef.current); }

  function hitObject(x: number, y: number) {
    const padding = 8 / Math.max(.05, viewportRef.current.zoom);
    return objectsRef.current.topFirst({ minX: x - padding, minY: y - padding, maxX: x + padding, maxY: y + padding })
      .find((object) => objectHitTest(object, x, y, viewportRef.current.zoom));
  }

  function eraseAt(x: number, y: number) {
    const radius = 14 / viewportRef.current.zoom;
    const hit = objectsRef.current.topFirst({ minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius })
      .find((object) => eraserCanHit(object, eraserMode) && eraserHitsObject(object, x, y, radius));
    if (!hit) return;
    if (eraserMode === "object" || eraserMode === "stroke") { applyDelete(hit.id); return; }
    const payload = hit.payload as StrokePayload;
    const runs: StrokePayload["points"][] = []; let run: StrokePayload["points"] = [];
    for (const point of payload.points) {
      if (Math.hypot(point.x - x, point.y - y) <= radius) { if (run.length > 1) runs.push(run); run = []; }
      else run.push(point);
    }
    if (run.length > 1) runs.push(run);
    applyDelete(hit.id);
    runs.forEach((points) => {
      const xs = points.map((point) => point.x); const ys = points.map((point) => point.y); const pad = payload.size;
      createObject("stroke", { ...payload, points }, { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad });
    });
  }

  function eraseAreaPath(eraserPoints: Array<{ x: number; y: number }>) {
    const radius = 14 / viewportRef.current.zoom; if (!eraserPoints.length) return;
    const xs = eraserPoints.map((point) => point.x); const ys = eraserPoints.map((point) => point.y);
    const strokes = objectsRef.current.visible({ minX: Math.min(...xs) - radius, minY: Math.min(...ys) - radius, maxX: Math.max(...xs) + radius, maxY: Math.max(...ys) + radius }, new Set<BoardObjectKind>(["stroke"]));
    for (const stroke of strokes) {
      const payload = stroke.payload as StrokePayload;
      if (!payload.points.some((point) => eraserPointHitsPath(point, eraserPoints, radius))) continue;
      const runs: StrokePayload["points"][] = []; let run: StrokePayload["points"] = [];
      for (const point of payload.points) {
        if (eraserPointHitsPath(point, eraserPoints, radius)) { if (run.length > 1) runs.push(run); run = []; }
        else run.push(point);
      }
      if (run.length > 1) runs.push(run); applyDelete(stroke.id);
      for (const points of runs) {
        const xs = points.map((point) => point.x); const ys = points.map((point) => point.y); const pad = payload.size;
        createObject("stroke", { ...payload, points }, { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad });
      }
    }
  }

  function rememberTextStyle(values: TextStyleValues) {
    setTextDefaults(values);
    try { window.localStorage.setItem(TEXT_STYLE_STORAGE_KEY, JSON.stringify(values)); } catch { /* Форматирование продолжает работать без localStorage. */ }
  }

  function addText(x: number, y: number, initial = "", layout?: { width: number; height: number; autoWidth: boolean }) {
    const measured = autoTextSize(initial, textDefaults);
    const width = layout?.width ?? 360; const height = layout?.height ?? Math.max(52, initial.split("\n").length * textDefaults.fontSize * 1.3);
    setEditorDraft({ kind: "text", x, y, width: layout?.autoWidth ? measured.width : width, height: layout?.autoWidth ? measured.height : height, autoWidth: layout?.autoWidth ?? false, value: initial, formats: [], ...textDefaults });
  }

  function addCode(x: number, y: number, initial = "") {
    if (!initial) { setEditorDraft({ kind: "code", x, y, value: "", language: "python" }); return; }
    const code = initial;
    const detection = detectCode(code); const width = 540; const height = Math.min(720, Math.max(170, code.split("\n").length * 21 + 74));
    createObject("code", { code, language: detection.language, x, y, width, height }, { minX: x, minY: y, maxX: x + width, maxY: y + height });
  }

  function editObjectAt(x: number, y: number) {
    if (!canEdit) return; const object = hitObject(x, y); if (!object) return;
    if (object.kind === "text") {
      const payload = object.payload as TextPayload;
      setSelection("");
      setEditorDraft({ kind: "text", x: payload.x, y: payload.y, width: payload.width, height: payload.height, autoWidth: payload.autoWidth === true, value: payload.text, formats: payload.formats ?? [], color: payload.color, fontFamily: payload.fontFamily ?? "sans", fontSize: payload.fontSize, fontWeight: payload.fontWeight ?? 500, fontStyle: payload.fontStyle ?? "normal", textAlign: payload.textAlign ?? "left", objectId: object.id });
    } else if (object.kind === "code") {
      const payload = object.payload as CodePayload; setEditorDraft({ kind: "code", x: payload.x, y: payload.y, value: payload.code, language: payload.language, objectId: object.id });
    }
  }

  function commitEditor() {
    if (!editorDraft) return;
    if (editorDraft.kind === "text" ? editorDraft.value.length === 0 : !editorDraft.value.trim()) { setEditorDraft(null); return; }
    if (editorDraft.objectId) {
      const object = objectsRef.current.get(editorDraft.objectId); if (!object) { setEditorDraft(null); return; }
      const before = cloneObject(object); const after = cloneObject(object);
      if (editorDraft.kind === "text") {
        const maxFontSize = Math.max(editorDraft.fontSize, ...editorDraft.formats.map((format) => format.fontSize ?? 0));
        const measured = fittedTextSize(editorDraft.value, { ...editorDraft, fontSize: maxFontSize }, editorDraft.autoWidth ? undefined : editorDraft.width); const width = measured.width; const height = measured.height;
        Object.assign(after.payload as TextPayload, { text: editorDraft.value.slice(0, 20_000), formats: editorDraft.formats, color: editorDraft.color, fontFamily: editorDraft.fontFamily, fontSize: editorDraft.fontSize, fontWeight: editorDraft.fontWeight, fontStyle: editorDraft.fontStyle, textAlign: editorDraft.textAlign, autoWidth: editorDraft.autoWidth, x: editorDraft.x, y: editorDraft.y, width, height });
        after.minX = editorDraft.x; after.minY = editorDraft.y; after.maxX = editorDraft.x + width; after.maxY = editorDraft.y + height;
      }
      else { const payload = after.payload as CodePayload; payload.code = editorDraft.value.slice(0, 50_000); payload.language = editorDraft.language; }
      applyUpdate(before, after); setSelection(after.id);
    } else if (editorDraft.kind === "text") {
      const maxFontSize = Math.max(editorDraft.fontSize, ...editorDraft.formats.map((format) => format.fontSize ?? 0));
      const measured = fittedTextSize(editorDraft.value, { ...editorDraft, fontSize: maxFontSize }, editorDraft.autoWidth ? undefined : editorDraft.width); const width = measured.width; const height = measured.height;
      const object = createObject("text", { text: editorDraft.value.slice(0, 20_000), formats: editorDraft.formats, color: editorDraft.color, fontFamily: editorDraft.fontFamily, fontSize: editorDraft.fontSize, fontWeight: editorDraft.fontWeight, fontStyle: editorDraft.fontStyle, textAlign: editorDraft.textAlign, autoWidth: editorDraft.autoWidth, x: editorDraft.x, y: editorDraft.y, width, height }, { minX: editorDraft.x, minY: editorDraft.y, maxX: editorDraft.x + width, maxY: editorDraft.y + height });
      setSelection(object.id); setTool("select");
    }
    else {
      const width = 540; const height = Math.min(720, Math.max(170, editorDraft.value.split("\n").length * 21 + 74));
      createObject("code", { code: editorDraft.value, language: editorDraft.language, x: editorDraft.x, y: editorDraft.y, width, height }, { minX: editorDraft.x, minY: editorDraft.y, maxX: editorDraft.x + width, maxY: editorDraft.y + height });
    }
    setEditorDraft(null);
  }

  function updateSelectedText(patch: Partial<TextStyleValues>) {
    const object = selectedRef.current ? objectsRef.current.get(selectedRef.current) : null;
    if (!object || object.kind !== "text") return;
    const before = cloneObject(object); const after = cloneObject(object); const payload = after.payload as TextPayload;
    if (patch.fontSize !== undefined) {
      const previousSize = Math.max(payload.fontSize, ...(payload.formats ?? []).map((format) => format.fontSize ?? 0));
      const delta = patch.fontSize - previousSize;
      payload.formats = (payload.formats ?? []).map((format) => format.fontSize === undefined ? format : { ...format, fontSize: Math.max(1, Math.min(160, format.fontSize + delta)) });
    }
    Object.assign(payload, patch);
    const nextStyle: TextStyleValues = { color: payload.color, fontFamily: payload.fontFamily ?? "sans", fontSize: payload.fontSize, fontWeight: payload.fontWeight ?? 500, fontStyle: payload.fontStyle ?? "normal", textAlign: payload.textAlign ?? "left" };
    rememberTextStyle(nextStyle);
    if (payload.autoWidth) { const measured = autoTextSize(payload.text, nextStyle); payload.width = measured.width; payload.height = measured.height; after.maxX = payload.x + payload.width; after.maxY = payload.y + payload.height; }
    else if (patch.fontSize) { payload.height = Math.max(payload.height, payload.text.split("\n").length * patch.fontSize * 1.3); after.maxY = payload.y + payload.height; }
    applyUpdate(before, after); setSelectionRevision((value) => value + 1);
  }

  function updateTextDraftStyle(patch: Partial<TextStyleValues>) {
    if (!editorDraft || editorDraft.kind !== "text") return;
    const nextStyle: TextStyleValues = { color: editorDraft.color, fontFamily: editorDraft.fontFamily, fontSize: editorDraft.fontSize, fontWeight: editorDraft.fontWeight, fontStyle: editorDraft.fontStyle, textAlign: editorDraft.textAlign, ...patch };
    rememberTextStyle(nextStyle);
    const start = textEditorRef.current?.selectionStart ?? 0; const end = textEditorRef.current?.selectionEnd ?? 0;
    const rangePatch = { ...(patch.color ? { color: patch.color } : {}), ...(patch.fontSize ? { fontSize: patch.fontSize } : {}) };
    if (start !== end && Object.keys(rangePatch).length) setEditorDraft({ ...editorDraft, formats: [...editorDraft.formats, { start, end, ...rangePatch }] });
    else setEditorDraft({ ...editorDraft, ...patch });
  }

  function setCodeLanguage(object: BoardObject, language: CodePayload["language"]) {
    if (object.kind !== "code") return; const before = cloneObject(object); const after = cloneObject(object);
    (after.payload as CodePayload).language = language; applyUpdate(before, after);
  }

  function changeTaskFont(objectId: string, delta: number) {
    if (!canEdit) return;
    const object = objectsRef.current.get(objectId); if (!object || (object.kind !== "task" && object.kind !== "code")) return;
    const before = cloneObject(object); const after = cloneObject(object); const payload = after.payload as TaskPayload | CodePayload;
    payload.fontScale = Math.max(.7, Math.min(10, Math.round(((payload.fontScale ?? 1) + delta) * 10) / 10));
    applyUpdate(before, after);
  }

  async function copyCode(object: BoardObject) {
    try {
      await navigator.clipboard.writeText((object.payload as CodePayload).code);
      setCopiedCodeId(object.id); setMessage("Код скопирован");
      window.clearTimeout(copiedCodeTimer.current);
      copiedCodeTimer.current = window.setTimeout(() => setCopiedCodeId(""), 2000);
    } catch { setMessage("Не удалось скопировать код"); }
  }

  function toggleTaskAnswer(objectId: string) {
    setTaskAnswersOpen((current) => {
      const next = new Set(current); if (next.has(objectId)) next.delete(objectId); else next.add(objectId); return next;
    });
  }

  async function uploadImage(file: File, screenPoint?: { x: number; y: number }) {
    if (!canEdit) return;
    if (!file.type.startsWith("image/")) { setMessage("Можно вставить только PNG, JPEG или WebP"); return; }
    setMessage("Загружаем изображение…");
    try {
      const form = new FormData(); form.set("image", file, file.name || "clipboard-image.png");
      const response = await fetch(`/api/boards/${board.id}/assets`, { method: "POST", headers: { "x-board-share": shareToken }, body: form });
      const body = await response.json() as { asset?: { id: string; src: string; width: number; height: number }; error?: string };
      if (!response.ok || !body.asset) throw new Error(body.error || "Не удалось загрузить изображение");
      const maxWidth = 720; const scale = Math.min(1, maxWidth / body.asset.width); const width = body.asset.width * scale; const height = body.asset.height * scale;
      const screen = screenPoint ?? pasteScreenPoint(width, height);
      const world = screenToWorld(screen, viewportRef.current);
      const object = createObject("image", { assetId: body.asset.id, src: body.asset.src, x: world.x, y: world.y, width, height }, { minX: world.x, minY: world.y, maxX: world.x + width, maxY: world.y + height });
      setSelection(object.id); setTool("select"); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить изображение"); }
  }

  async function uploadBoardFile(file: File, screenPoint?: { x: number; y: number }) {
    if (!canEdit) return;
    if (file.size > 15 * 1024 * 1024) { setMessage("Файл должен быть не больше 15 МБ"); return; }
    if (file.type.startsWith("image/")) { await uploadImage(file, screenPoint); return; }
    setMessage("Загружаем файл…");
    try {
      const form = new FormData(); form.set("file", file, file.name);
      const response = await fetch(`/api/boards/${board.id}/assets`, { method: "POST", headers: { "x-board-share": shareToken }, body: form });
      const body = await response.json() as { asset?: { id: string; src: string; name: string; mime: string; size: number }; error?: string };
      if (!response.ok || !body.asset) throw new Error(body.error || "Не удалось загрузить файл");
      const size = sizeRef.current; const screen = screenPoint ?? { x: size.width / 2 - 180, y: size.height / 2 - 46 }; const world = screenToWorld(screen, viewportRef.current); const width = 360; const height = 92;
      const object = createObject("file", { assetId: body.asset.id, src: body.asset.src, name: body.asset.name, mime: body.asset.mime, size: body.asset.size, x: world.x, y: world.y, width, height }, { minX: world.x, minY: world.y, maxX: world.x + width, maxY: world.y + height });
      setSelection(object.id); setTool("select"); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить файл"); }
  }

  async function insertTask() {
    const id = taskSearch.trim(); if (!id || taskSearching) return; setTaskSearching(true);
    try {
      const response = await fetch(`/api/boards/tasks?id=${encodeURIComponent(id)}`); const body = await response.json() as { task?: { id: string; number: number; note: string; text: string; html: string; images: string[]; files: Array<{ name: string; href: string; meta?: string }>; answer: string }; error?: string };
      if (!response.ok || !body.task) throw new Error(body.error || "Задание не найдено");
      const width = 720; const lineCount = Math.max(6, Math.ceil(body.task.text.length / 86)); const imageHeight = Math.min(360, (body.task.images?.length ?? 0) * 240); const tableHeight = /<table\b/i.test(body.task.html) ? 260 : 0; const fileHeight = body.task.files?.length ? 82 : 0; const height = Math.min(1080, 100 + lineCount * 23 + imageHeight + tableHeight + fileHeight); const size = sizeRef.current; const world = screenToWorld({ x: size.width / 2 - width / 2, y: size.height / 2 - Math.min(height, size.height - 120) / 2 }, viewportRef.current);
      const object = createObject("task", { taskId: body.task.id, number: body.task.number, note: body.task.note, text: body.task.text, html: body.task.html, images: body.task.images ?? [], files: body.task.files ?? [], answer: body.task.answer, fontScale: 1, x: world.x, y: world.y, width, height }, { minX: world.x, minY: world.y, maxX: world.x + width, maxY: world.y + height });
      setSelection(object.id); setTool("select"); setTaskSearch(""); setTaskSearchOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Задание не найдено"); } finally { setTaskSearching(false); }
  }

  async function hydrateExistingTaskImages(objects: BoardObject[]) {
    if (permission !== "edit") return;
    const tasks = objects.filter((object) => object.kind === "task" && (!(object.payload as TaskPayload).html || !(object.payload as TaskPayload).images?.length || !(object.payload as TaskPayload).answer || !(object.payload as TaskPayload).fontScale || (object.payload as TaskPayload).files === undefined));
    await Promise.all(tasks.map(async (object) => {
      try {
        const payload = object.payload as TaskPayload; const response = await fetch(`/api/boards/tasks?id=${encodeURIComponent(payload.taskId)}&number=${payload.number}`);
        const body = await response.json() as { task?: { html?: string; images?: string[]; files?: Array<{ name: string; href: string; meta?: string }>; answer?: string } }; if (!response.ok || !body.task) return;
        const current = objectsRef.current.get(object.id); if (!current || current.version !== object.version) return;
        const after = cloneObject(current); const taskPayload = after.payload as TaskPayload; const needsFileSpace = taskPayload.files === undefined && Boolean(body.task.files?.length); taskPayload.html = body.task.html ?? taskPayload.html; taskPayload.images = body.task.images ?? taskPayload.images; taskPayload.files = body.task.files ?? taskPayload.files ?? []; taskPayload.answer = body.task.answer ?? taskPayload.answer; taskPayload.fontScale ??= 1;
        if (needsFileSpace) { taskPayload.height = Math.min(8000, taskPayload.height + 82); after.maxY = taskPayload.y + taskPayload.height; }
        if (taskPayload.html && /<table\b/i.test(taskPayload.html) && taskPayload.height < 600) { taskPayload.height = 600; after.maxY = taskPayload.y + taskPayload.height; }
        applyUpdate(current, after, false);
      } catch { /* Старая карточка остаётся доступной, даже если изображение временно не загрузилось. */ }
    }));
  }

  function moveLayer(direction: "front" | "forward" | "backward" | "back") {
    const selected = selectedRef.current ? objectsRef.current.get(selectedRef.current) : null; if (!selected) return;
    const ordered = Array.from(objectsRef.current.values()).sort((a, b) => a.zIndex - b.zIndex); const index = ordered.findIndex((object) => object.id === selected.id); if (index < 0) return;
    if (direction === "front" || direction === "back") {
      const after = cloneObject(selected); after.zIndex = direction === "front" ? Math.max(...ordered.map((object) => object.zIndex)) + 1 : Math.max(0, Math.min(...ordered.map((object) => object.zIndex)) - 1); applyUpdate(selected, after); return;
    }
    const other = ordered[index + (direction === "forward" ? 1 : -1)]; if (!other) return;
    const selectedAfter = cloneObject(selected); const otherAfter = cloneObject(other); selectedAfter.zIndex = other.zIndex; otherAfter.zIndex = selected.zIndex; applyUpdate(other, otherAfter); applyUpdate(selected, selectedAfter);
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (taskTextSelectionId) {
      setTaskTextSelectionId("");
      window.getSelection()?.removeAllRanges();
    }
    if (editorDraft) { commitEditor(); event.preventDefault(); return; }
    if (event.pointerType === "touch") {
      touchPoints.current.set(event.pointerId, localPoint(event)); event.currentTarget.setPointerCapture(event.pointerId);
      if (touchPoints.current.size === 1) {
        const point = localPoint(event); pointerSession.current = { type: "pan", pointerId: event.pointerId, startX: point.x, startY: point.y, viewport: { ...viewportRef.current } };
      } else if (touchPoints.current.size === 2) {
        const [a, b] = Array.from(touchPoints.current.values());
        pinchState.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), viewport: { ...viewportRef.current }, center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      }
      return;
    }
    const point = localPoint(event); const world = worldPoint(event);
    if (backgroundOpen) setBackgroundOpen(false);
    if (tool !== "select" && selectedRef.current) setSelection("");
    const pan = tool === "pan" || spacePressed.current || event.button === 1 || event.button === 2;
    if (pan) pointerSession.current = { type: "pan", pointerId: event.pointerId, startX: point.x, startY: point.y, viewport: { ...viewportRef.current } };
    else if (!canEdit) return;
    else if (tool === "pen") {
      pointerSession.current = { type: "pen", pointerId: event.pointerId };
      recognizedShape.current = null; recognizedBaseShape.current = null; recognizedAtPoint.current = null; window.clearTimeout(shapeRecognitionTimer.current);
      liveStrokeId.current = `live_${crypto.randomUUID()}`; lastStrokePointSent.current = 0;
      penEngine.current.begin({ ...world, pressure: event.pressure, time: event.timeStamp, pointerType: event.pointerType }); paintLiveStroke(); armShapeRecognition();
    } else if (tool === "select") {
      const selected = selectedIdsRef.current.size === 1 && selectedRef.current ? objectsRef.current.get(selectedRef.current) : null;
      const handle = selected ? hitSelectionHandle(selected, world.x, world.y, viewportRef.current.zoom) : null;
      if (handle && selected) pointerSession.current = { type: "resize", pointerId: event.pointerId, original: cloneObject(selected), handle };
      else {
        const hit = hitObject(world.x, world.y);
        if (hit) {
          if (event.shiftKey) {
            const next = new Set(selectedIdsRef.current); if (next.has(hit.id)) next.delete(hit.id); else next.add(hit.id); setSelections(next, next.has(hit.id) ? hit.id : "");
          } else if (!selectedIdsRef.current.has(hit.id)) setSelection(hit.id);
          const originals = Array.from(selectedIdsRef.current, (id) => objectsRef.current.get(id)).filter((object): object is BoardObject => Boolean(object)).map(cloneObject);
          if (selectedIdsRef.current.has(hit.id)) pointerSession.current = { type: "move", pointerId: event.pointerId, startX: world.x, startY: world.y, originals };
        } else {
          const initialIds = event.shiftKey ? Array.from(selectedIdsRef.current) : []; if (!event.shiftKey) setSelection("");
          pointerSession.current = { type: "marquee", pointerId: event.pointerId, startX: world.x, startY: world.y, currentX: world.x, currentY: world.y, additive: event.shiftKey, initialIds };
          setMarquee({ left: point.x, top: point.y, width: 0, height: 0 });
        }
      }
    } else if (tool === "eraser") { pointerSession.current = { type: "erase", pointerId: event.pointerId, points: [world] }; if (eraserMode !== "area") eraseAt(world.x, world.y); }
    else if (tool === "text") {
      pointerSession.current = { type: "text", pointerId: event.pointerId, startX: world.x, startY: world.y, currentX: world.x, currentY: world.y };
      setMarquee({ left: point.x, top: point.y, width: 0, height: 0 });
    }
    else if (tool === "code") addCode(world.x, world.y);
    else if (tool === "rectangle" || tool === "ellipse" || tool === "star" || tool === "line" || tool === "arrow") {
      const draft = drawnObject(tool, world.x, world.y, world.x, world.y);
      objectsRef.current.set(draft.id, draft); scheduleRender();
      pointerSession.current = { type: "draw", pointerId: event.pointerId, startX: world.x, startY: world.y, objectId: draft.id, kind: tool };
    }
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      const local = localPoint(event); lastPointerScreen.current = local;
      if (eraserCursorRef.current) {
        eraserCursorRef.current.style.opacity = tool === "eraser" ? "1" : "0";
        eraserCursorRef.current.style.transform = `translate3d(${local.x}px, ${local.y}px, 0)`;
      }
      const cursor = worldPoint(event);
      if (!cursorFrame.current) cursorFrame.current = window.requestAnimationFrame((now) => {
        cursorFrame.current = 0;
        if (now - lastCursorSentAt.current < 32) return;
        lastCursorSentAt.current = now;
        collaborationRef.current?.sendCursor(cursor.x, cursor.y);
      });
    }
    if (event.pointerType === "touch") {
      if (!touchPoints.current.has(event.pointerId)) return;
      touchPoints.current.set(event.pointerId, localPoint(event));
      if (touchPoints.current.size >= 2 && pinchState.current) {
        const [a, b] = Array.from(touchPoints.current.values()); const distance = Math.hypot(a.x - b.x, a.y - b.y);
        viewportRef.current = zoomAt(pinchState.current.viewport, pinchState.current.center, distance / Math.max(1, pinchState.current.distance));
        setZoomLabel(Math.round(viewportRef.current.zoom * 100)); scheduleRender();
      } else if (pointerSession.current?.type === "pan") {
        const point = localPoint(event); const session = pointerSession.current;
        viewportRef.current = { ...session.viewport, x: session.viewport.x + point.x - session.startX, y: session.viewport.y + point.y - session.startY }; scheduleRender();
      }
      return;
    }
    const session = pointerSession.current; if (!session || session.pointerId !== event.pointerId) return;
    if (session.type === "pan") {
      const point = localPoint(event); viewportRef.current = { ...session.viewport, x: session.viewport.x + point.x - session.startX, y: session.viewport.y + point.y - session.startY }; scheduleRender();
    } else if (session.type === "pen") {
      const currentWorld = worldPoint(event);
      if (recognizedShape.current && recognizedBaseShape.current && recognizedAtPoint.current) {
        recognizedShape.current = resizeRecognizedShape(recognizedBaseShape.current, recognizedAtPoint.current, currentWorld);
        paintLiveStroke(); event.preventDefault(); return;
      }
      recognizedShape.current = null; recognizedBaseShape.current = null; recognizedAtPoint.current = null;
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
      const events = coalesced.length ? coalesced : [event.nativeEvent];
      for (const sample of events) {
        const point = worldPoint(sample); penEngine.current.add({ ...point, pressure: sample.pressure, time: sample.timeStamp, pointerType: sample.pointerType }, viewportRef.current.zoom);
      }
      const points = penEngine.current.value();
      if (points.length - lastStrokePointSent.current >= 3) {
        const batch = points.slice(lastStrokePointSent.current).map((point) => [point.x, point.y, point.pressure]);
        lastStrokePointSent.current = points.length;
        collaborationRef.current?.sendStroke(liveStrokeId.current, color, penSize, batch);
      }
      paintLiveStroke(); armShapeRecognition();
    } else if (session.type === "move") {
      const world = worldPoint(event); let dx = world.x - session.startX; let dy = world.y - session.startY;
      const canSnap = snapEnabled && session.originals.length > 0 && session.originals.every((object) => object.kind === "image" || object.kind === "text" || object.kind === "task");
      if (canSnap) {
        const movedBounds = objectBounds(session.originals.map((object) => translated(object, dx, dy)));
        if (movedBounds) {
          const movingIds = new Set(session.originals.map((object) => object.id));
          const snapThreshold = 8 / viewportRef.current.zoom;
          const nearby = objectsRef.current.visible({ minX: movedBounds.minX - snapThreshold, minY: movedBounds.minY - snapThreshold, maxX: movedBounds.maxX + snapThreshold, maxY: movedBounds.maxY + snapThreshold })
            .filter((object) => !movingIds.has(object.id));
          const snapped = snapBounds(movedBounds, nearby, snapThreshold);
          dx += snapped.dx; dy += snapped.dy; setAlignmentGuides(snapped.guides);
        }
      } else setAlignmentGuides({});
      for (const original of session.originals) objectsRef.current.set(original.id, translated(original, dx, dy)); scheduleRender();
    } else if (session.type === "marquee") {
      const point = localPoint(event); const world = worldPoint(event); session.currentX = world.x; session.currentY = world.y;
      const minX = Math.min(session.startX, world.x); const minY = Math.min(session.startY, world.y); const maxX = Math.max(session.startX, world.x); const maxY = Math.max(session.startY, world.y);
      const selectionBounds = { minX, minY, maxX, maxY };
      const hits = objectsRef.current.visible(selectionBounds).filter((object) => objectIntersectsSelectionBox(object, selectionBounds)).map((object) => object.id);
      setSelections(session.additive ? [...session.initialIds, ...hits] : hits);
      const start = worldToScreen({ x: session.startX, y: session.startY }, viewportRef.current); setMarquee({ left: Math.min(start.x, point.x), top: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) });
    } else if (session.type === "text") {
      const point = localPoint(event); const world = worldPoint(event); session.currentX = world.x; session.currentY = world.y;
      const start = worldToScreen({ x: session.startX, y: session.startY }, viewportRef.current);
      setMarquee({ left: Math.min(start.x, point.x), top: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) });
    } else if (session.type === "resize") {
      const world = worldPoint(event); objectsRef.current.set(session.original.id, resizeFromHandle(session.original, world.x, world.y, session.handle, event.shiftKey)); scheduleRender();
    } else if (session.type === "draw") {
      const world = worldPoint(event);
      const end = constrainedShapePoint(session.kind, session.startX, session.startY, world.x, world.y, event.shiftKey);
      objectsRef.current.set(session.objectId, drawnObject(session.kind, session.startX, session.startY, end.x, end.y, session.objectId)); scheduleRender();
    } else if (session.type === "erase") { const world = worldPoint(event); if (eraserMode === "area") { const last = session.points.at(-1); if (!last || Math.hypot(world.x - last.x, world.y - last.y) >= 5 / viewportRef.current.zoom) session.points.push(world); } else eraseAt(world.x, world.y); }
    event.preventDefault();
  }

  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      touchPoints.current.delete(event.pointerId); pinchState.current = null; pointerSession.current = null; return;
    }
    const session = pointerSession.current; if (!session || session.pointerId !== event.pointerId) return;
    if (session.type === "text") {
      setMarquee(null);
      const dx = session.currentX - session.startX; const dy = session.currentY - session.startY;
      const dragged = Math.hypot(dx, dy) * viewportRef.current.zoom >= 8;
      if (dragged) {
        const x = Math.min(session.startX, session.currentX); const y = Math.min(session.startY, session.currentY);
        addText(x, y, "", { width: Math.max(80, Math.abs(dx)), height: Math.max(44, Math.abs(dy)), autoWidth: false });
      } else addText(session.startX, session.startY, "", { width: 44, height: 44, autoWidth: true });
    } else if (session.type === "pen") {
      window.clearTimeout(shapeRecognitionTimer.current);
      const points = penEngine.current.value().slice();
      const context = liveRef.current?.getContext("2d"); if (context && liveRef.current) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, liveRef.current.width, liveRef.current.height); }
      const shape = recognizedShape.current;
      if (shape) {
        collaborationRef.current?.endStroke(liveStrokeId.current);
        const object = shape.kind === "line"
          ? drawnObject("line", shape.startX, shape.startY, shape.endX, shape.endY)
          : drawnObject(shape.kind, shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
        applyCreate(object); setSelection("");
      } else if (points.length >= 2) {
        if (lastStrokePointSent.current < points.length) collaborationRef.current?.sendStroke(liveStrokeId.current, color, penSize, points.slice(lastStrokePointSent.current).map((point) => [point.x, point.y, point.pressure]));
        collaborationRef.current?.endStroke(liveStrokeId.current);
        const xs = points.map((point) => point.x); const ys = points.map((point) => point.y); const pad = penSize;
        createObject("stroke", { color, size: penSize, points }, { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad });
      }
      recognizedShape.current = null; recognizedBaseShape.current = null; recognizedAtPoint.current = null;
    } else if (session.type === "move") {
      setAlignmentGuides({});
      for (const original of session.originals) {
        const current = objectsRef.current.get(original.id);
        if (current && (current.minX !== original.minX || current.minY !== original.minY || current.maxX !== original.maxX || current.maxY !== original.maxY)) applyUpdate(original, current);
      }
    } else if (session.type === "resize") {
      const current = objectsRef.current.get(session.original.id);
      if (current && (current.minX !== session.original.minX || current.minY !== session.original.minY || current.maxX !== session.original.maxX || current.maxY !== session.original.maxY)) applyUpdate(session.original, current);
    } else if (session.type === "marquee") {
      setMarquee(null);
    } else if (session.type === "erase" && eraserMode === "area") {
      eraseAreaPath(session.points);
    } else if (session.type === "draw") {
      const object = objectsRef.current.get(session.objectId);
      const width = object ? object.maxX - object.minX : 0; const height = object ? object.maxY - object.minY : 0;
      const tooSmall = session.kind === "line" || session.kind === "arrow"
        ? !object || (() => { const payload = object.payload as LinePayload; return Math.hypot(payload.endX - payload.startX, payload.endY - payload.startY) < 5 / viewportRef.current.zoom; })()
        : width < 5 / viewportRef.current.zoom || height < 5 / viewportRef.current.zoom;
      if (!object || tooSmall) {
        objectsRef.current.delete(session.objectId); scheduleRender();
      } else {
        applyCreate(object); setSelection("");
      }
    }
    pointerSession.current = null;
  }

  function changeZoom(factor: number) {
    const { width, height } = sizeRef.current;
    viewportRef.current = zoomAt(viewportRef.current, { x: width / 2, y: height / 2 }, factor);
    setZoomLabel(Math.round(viewportRef.current.zoom * 100)); scheduleRender();
  }

  function fitContent() {
    const bounds = objectBounds(objectsRef.current.values()); const size = sizeRef.current;
    viewportRef.current = bounds ? fitBounds(bounds, size.width, size.height) : { x: size.width / 2, y: size.height / 2, zoom: 1 };
    setZoomLabel(Math.round(viewportRef.current.zoom * 100)); scheduleRender();
  }

  function undo() { const entry = undoStack.current.pop(); if (!entry) return; entry.undo(); redoStack.current.push(entry); updateHistory(); }
  function redo() { const entry = redoStack.current.pop(); if (!entry) return; entry.redo(); undoStack.current.push(entry); updateHistory(); }

  useEffect(() => {
    const copySelectionToSystem = async (objects: BoardObject[]) => {
      const single = objects.length === 1 ? objects[0] : null;
      try {
        if (single?.kind === "image" && "ClipboardItem" in window) {
          const source = (single.payload as { src: string }).src;
          const png = imageResponseAsPng(fetch(`${source}${shareToken ? `?share=${encodeURIComponent(shareToken)}` : ""}`));
          await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
          setMessage("Изображение скопировано");
          return;
        }
        if (single?.kind === "text") await navigator.clipboard.writeText((single.payload as TextPayload).text);
        else if (single?.kind === "code") await navigator.clipboard.writeText((single.payload as CodePayload).code);
        else if (single?.kind === "task") {
          const payload = single.payload as TaskPayload;
          await navigator.clipboard.writeText(`Задание №${payload.number} · ID ${payload.taskId}\n\n${payload.text}`);
        } else await navigator.clipboard.writeText("");
      } catch { setMessage("Объект скопирован внутри доски"); }
    };
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null; if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const nativeSelection = window.getSelection();
      const selectionNode = nativeSelection?.anchorNode instanceof Element ? nativeSelection.anchorNode : nativeSelection?.anchorNode?.parentElement;
      if ((event.metaKey || event.ctrlKey) && event.code === "KeyC" && !nativeSelection?.isCollapsed && selectionNode?.closest("[data-board-task-id].is-text-selecting")) return;
      if (event.key === "Escape" && helpOpen) { event.preventDefault(); setHelpOpen(false); return; }
      if (event.code === "NumpadAdd" || event.code === "NumpadSubtract") {
        event.preventDefault(); changeZoom(event.code === "NumpadAdd" ? 1.2 : 1 / 1.2); return;
      }
      if (event.code === "Space") { spacePressed.current = true; event.preventDefault(); }
      if ((event.metaKey || event.ctrlKey) && event.code === "KeyZ") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.metaKey || event.ctrlKey) && event.code === "KeyY") { event.preventDefault(); redo(); }
      else if ((event.metaKey || event.ctrlKey) && event.code === "KeyA" && canEdit) { event.preventDefault(); setSelections(objectsRef.current.keys()); }
      else if ((event.key === "Delete" || event.key === "Backspace") && canEdit && selectedIdsRef.current.size) { event.preventDefault(); const ids = Array.from(selectedIdsRef.current); setSelection(""); for (const id of ids) applyDelete(id); }
      else if ((event.metaKey || event.ctrlKey) && (event.code === "KeyC" || event.code === "KeyX") && selectedIdsRef.current.size) {
        event.preventDefault(); clipboardObjects.current = Array.from(selectedIdsRef.current, (id) => objectsRef.current.get(id)).filter((object): object is BoardObject => Boolean(object)).map(cloneObject);
        void copySelectionToSystem(clipboardObjects.current);
        if (event.code === "KeyX" && canEdit) { const ids = Array.from(selectedIdsRef.current); setSelection(""); for (const id of ids) applyDelete(id); }
      }
      else if ((event.metaKey || event.ctrlKey) && event.code === "KeyD" && selectedIdsRef.current.size && canEdit) {
        event.preventDefault(); const copies = Array.from(selectedIdsRef.current, (id) => objectsRef.current.get(id)).filter((object): object is BoardObject => Boolean(object)).map((source) => translated({ ...cloneObject(source), id: newObjectId(), version: 1 }, 28, 28)); for (const copy of copies) applyCreate(copy); setSelections(copies.map((copy) => copy.id));
      } else if (event.key === "Escape") setSelection("");
      else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const shortcuts: Partial<Record<KeyboardEvent["code"], Tool>> = {
          KeyV: "select", KeyH: "pan", KeyP: "pen", KeyE: "eraser", KeyT: "text",
          KeyR: "rectangle", KeyO: "ellipse", KeyS: "star", KeyL: "line", KeyA: "arrow", KeyC: "code",
        };
        const nextTool = shortcuts[event.code];
        if (nextTool && (canEdit || nextTool === "pan")) { event.preventDefault(); chooseTool(nextTool); }
        else if (canEdit && selectedIdsRef.current.size && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault(); const step = event.shiftKey ? 10 : 1;
          const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
          const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
          for (const id of selectedIdsRef.current) { const selected = objectsRef.current.get(id); if (selected) applyUpdate(selected, translated(selected, dx, dy)); }
        }
      }
    };
    const keyUp = (event: KeyboardEvent) => { if (event.code === "Space") spacePressed.current = false; };
    const paste = (event: ClipboardEvent) => {
      if (!canEdit) return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image) { event.preventDefault(); if (editorDraft) commitEditor(); void uploadImage(image); return; }
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const text = event.clipboardData?.getData("text/plain") ?? ""; const detection = detectCode(text);
      const screen = pasteScreenPoint(520, 260);
      if (detection.isCode && detection.confidence >= .62) {
        event.preventDefault(); const world = screenToWorld(screen, viewportRef.current); addCode(world.x, world.y, text);
      } else if (detection.isCode) {
        event.preventDefault(); const world = screenToWorld(screen, viewportRef.current); setPasteSuggestion({ text, x: world.x, y: world.y });
      } else if (text.trim()) {
        event.preventDefault(); const world = screenToWorld(screen, viewportRef.current); addText(world.x, world.y, text);
      } else if (clipboardObjects.current.length) {
        event.preventDefault(); const bounds = objectBounds(clipboardObjects.current); const world = screenToWorld(screen, viewportRef.current);
        const dx = bounds ? world.x - bounds.minX : 28; const dy = bounds ? world.y - bounds.minY : 28;
        const copies = clipboardObjects.current.map((source) => translated({ ...cloneObject(source), id: newObjectId(), version: 1 }, dx, dy));
        for (const copy of copies) applyCreate(copy); clipboardObjects.current = copies.map(cloneObject); setSelections(copies.map((copy) => copy.id));
      }
    };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("paste", paste);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("paste", paste); };
  });

  const selectedText = selectedIds.length === 1 && selectedId && objectsRef.current.get(selectedId)?.kind === "text"
    ? objectsRef.current.get(selectedId)!.payload as TextPayload
    : null;
  const selectedFile = selectedIds.length === 1 && selectedId && objectsRef.current.get(selectedId)?.kind === "file"
    ? objectsRef.current.get(selectedId)!.payload as FilePayload
    : null;
  const selectedTextValues: TextStyleValues | null = selectedText ? {
    color: selectedText.color, fontFamily: selectedText.fontFamily ?? "sans", fontSize: Math.max(selectedText.fontSize, ...(selectedText.formats ?? []).map((format) => format.fontSize ?? 0)),
    fontWeight: selectedText.fontWeight ?? 500, fontStyle: selectedText.fontStyle ?? "normal", textAlign: selectedText.textAlign ?? "left",
  } : null;
  const textDraft = editorDraft?.kind === "text" ? editorDraft : null;
  const draftSelectionStart = textEditorRef.current?.selectionStart ?? 0;
  const draftSelectionEnd = textEditorRef.current?.selectionEnd ?? 0;
  const draftSelectionFormat = textDraft && draftSelectionStart !== draftSelectionEnd ? [...textDraft.formats].reverse().find((format) => format.start <= draftSelectionStart && format.end >= draftSelectionEnd && format.fontSize) : undefined;
  const measuredTextDraft = textDraft ? autoTextSize(textDraft.value || "Введите текст", textDraft) : null;
  const textDraftWidth = textDraft ? textDraft.autoWidth ? measuredTextDraft!.width : textDraft.width : 0;
  const textDraftHeight = textDraft ? textDraft.autoWidth ? measuredTextDraft!.height : Math.max(textDraft.height, Math.max(1, textDraft.value.split("\n").length) * textDraft.fontSize * 1.3) : 0;
  const textDraftLineSize = textDraft ? Math.max(textDraft.fontSize, ...textDraft.formats.map((format) => format.fontSize ?? 0)) : 0;
  const textDraftPreviewHeight = textDraft ? fittedTextSize(textDraft.value, { ...textDraft, fontSize: textDraftLineSize }, textDraft.autoWidth ? undefined : textDraft.width).height : 0;
  const textDraftScreen = textDraft ? {
    left: textDraft.x * viewportRef.current.zoom + viewportRef.current.x,
    top: textDraft.y * viewportRef.current.zoom + viewportRef.current.y,
    width: textDraftWidth * viewportRef.current.zoom,
    height: textDraftHeight * viewportRef.current.zoom,
  } : null;
  const visibleRichObjects = visibleRichObjectIds.map((id) => objectsRef.current.get(id)).filter((object): object is BoardObject => Boolean(object));
  const taskObjects = visibleRichObjects.filter((object) => object.kind === "task" && Boolean((object.payload as TaskPayload).html));
  const codeObjects = visibleRichObjects.filter((object) => object.kind === "code");
  const ActiveShapeIcon = shapeTool === "ellipse" ? Circle : shapeTool === "star" ? Star : Square;
  void objectRevision;

  return (
    <div ref={shellRef} className={`board-surface tool-${tool} ${permission === "view" ? "is-view-only" : ""}`} style={{ backgroundColor: board.backgroundColor }} onContextMenu={(event) => event.preventDefault()} onPointerLeave={() => { if (eraserCursorRef.current) eraserCursorRef.current.style.opacity = "0"; }} onDoubleClick={(event) => { if (tool === "select") { const world = screenToWorld(localPoint(event), viewportRef.current); const hit = hitObject(world.x, world.y); if (hit?.kind === "task") { setSelection(hit.id); setTaskTextSelectionId(hit.id); setMessage("Текст задания можно выделять и копировать"); } else editObjectAt(world.x, world.y); } }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => {
      if (!canEdit) return; event.preventDefault(); const file = Array.from(event.dataTransfer.files)[0];
      if (file) { const rect = shellRef.current!.getBoundingClientRect(); void uploadBoardFile(file, { x: event.clientX - rect.left, y: event.clientY - rect.top }); }
    }}>
      <canvas ref={backgroundRef} className="board-canvas board-background-canvas" />
      <canvas ref={committedRef} className="board-canvas board-committed-canvas" />
      <canvas ref={liveRef} className="board-canvas board-live-canvas" />
      <div ref={taskLayerRef} className="board-task-rich-layer" data-theme={board.backgroundColor === BRAND_DARK ? "dark" : "light"}>
        {taskObjects.map((object) => { const payload = object.payload as TaskPayload; const answerOpen = taskAnswersOpen.has(object.id); return <article className={`board-task-rich-card task-item ${answerOpen ? "is-answer-open" : ""} ${taskTextSelectionId === object.id ? "is-text-selecting" : ""}`} data-board-task-id={object.id} data-task-number={payload.number} key={object.id} style={{ width: payload.width, height: payload.height, transform: `translate(${payload.x * viewportRef.current.zoom + viewportRef.current.x}px, ${payload.y * viewportRef.current.zoom + viewportRef.current.y}px) scale(${viewportRef.current.zoom})`, "--board-task-font-scale": payload.fontScale ?? 1 } as React.CSSProperties} onPointerDown={taskTextSelectionId === object.id ? (event) => event.stopPropagation() : undefined}>
          <div className="task-heading-row">
            <span className="task-number-badge">{payload.number}</span>
            <div><p className="task-primary-source">{payload.note || "База КЕГЭ"}</p><div className="task-meta"><span className="task-id">ID {payload.taskId}</span></div></div>
            <div className="board-task-font-controls" onPointerDown={(event) => event.stopPropagation()}>
              <button onClick={() => changeTaskFont(object.id, -.1)} aria-label="Уменьшить шрифт задания"><Minus /></button>
              <span>{Math.round((payload.fontScale ?? 1) * 100)}%</span>
              <button onClick={() => changeTaskFont(object.id, .1)} aria-label="Увеличить шрифт задания"><Plus /></button>
            </div>
          </div>
          <RichHtml className="task-body task-html board-task-rich-html" html={payload.html ?? ""} />
          {Boolean(payload.files?.length) && <div className="task-files board-task-files">
            {payload.files?.map((file) => <a className="file-link" href={taskDownloadHref(file.href, file.name, payload.taskId)} download={taskDownloadName(file.name, payload.taskId)} title={file.name} onPointerDown={(event) => event.stopPropagation()} key={file.href}>
              <span className="file-icon"><Download aria-hidden="true" /></span>
              <span><b>{file.name}</b><small>{file.meta || "Файл к заданию"}</small></span>
            </a>)}
          </div>}
          {payload.answer && <><button className={`answer-toggle ${answerOpen ? "is-open" : ""}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => toggleTaskAnswer(object.id)} aria-expanded={answerOpen}>{answerOpen ? "Скрыть ответ" : "Показать ответ"}</button>
          <div className={`answer-reveal ${answerOpen ? "is-open" : ""}`}><div><div className="answer-inner"><p className="answer-label">Ответ</p><p className="answer-value">{payload.answer.replace(/\\n/g, "\n")}</p></div></div></div></>}
        </article>; })}
      </div>
      <div className="board-code-header-layer">
        {codeObjects.map((object) => { const payload = object.payload as CodePayload; return <div key={object.id} className="board-code-header" data-board-code-id={object.id} style={{ width: payload.width, transform: `translate(${payload.x * viewportRef.current.zoom + viewportRef.current.x}px, ${payload.y * viewportRef.current.zoom + viewportRef.current.y}px) scale(${viewportRef.current.zoom})` }}>
          <div className="board-task-font-controls board-code-font-controls" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
            <button disabled={!canEdit} onClick={() => changeTaskFont(object.id, -.1)} aria-label="Уменьшить шрифт кода"><Minus /></button>
            <span>{Math.round((payload.fontScale ?? 1) * 100)}%</span>
            <button disabled={!canEdit} onClick={() => changeTaskFont(object.id, .1)} aria-label="Увеличить шрифт кода"><Plus /></button>
          </div>
          <button className="board-code-copy" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onClick={() => void copyCode(object)} aria-label="Копировать код" title="Копировать код">{copiedCodeId === object.id ? <Check /> : <Copy />}</button>
        </div>; })}
      </div>
      <div ref={eraserCursorRef} className="board-eraser-cursor" aria-hidden="true" />
      {marquee && <div className="board-selection-marquee" style={marquee} aria-hidden="true" />}
      {alignmentGuides.x !== undefined && <div className="board-alignment-guide is-vertical" style={{ left: worldToScreen({ x: alignmentGuides.x, y: 0 }, viewportRef.current).x }} aria-hidden="true" />}
      {alignmentGuides.y !== undefined && <div className="board-alignment-guide is-horizontal" style={{ top: worldToScreen({ x: 0, y: alignmentGuides.y }, viewportRef.current).y }} aria-hidden="true" />}
      {loading && <div className="board-loading-layer"><span>•••</span><p>Восстанавливаем доску</p></div>}
      <div className="board-toolbar" role="toolbar" aria-label="Инструменты доски" onPointerDown={(event) => event.stopPropagation()}>
        <button className={tool === "select" ? "is-active" : ""} onClick={() => chooseTool("select")} disabled={!canEdit} title="Выбор (V)"><MousePointer2 /></button>
        <button className={snapEnabled ? "is-active" : ""} onClick={() => setSnapEnabled((current) => { const next = !current; window.localStorage.setItem(SNAP_STORAGE_KEY, next ? "on" : "off"); setAlignmentGuides({}); return next; })} disabled={!canEdit} title={snapEnabled ? "Направляющие включены" : "Направляющие выключены"} aria-pressed={snapEnabled}><Magnet /></button>
        <button className={tool === "pan" ? "is-active" : ""} onClick={() => chooseTool("pan")} title="Полотно (H)"><Hand /></button>
        <i />
        <button className={tool === "pen" ? "is-active" : ""} onClick={() => chooseTool("pen")} disabled={!canEdit} title="Перо (P)"><PenLine /></button>
        <button className={tool === "eraser" ? "is-active" : ""} onClick={() => chooseTool("eraser")} disabled={!canEdit} title="Ластик (E)"><Eraser /></button>
        <button className={tool === "text" ? "is-active" : ""} onClick={() => chooseTool("text")} disabled={!canEdit} title="Текст (T)"><Type /></button>
        <div className={`board-shape-picker ${shapeMenuOpen ? "is-open" : ""}`} onMouseEnter={() => setShapeMenuOpen(true)} onMouseLeave={() => setShapeMenuOpen(false)}>
          <button className={tool === "rectangle" || tool === "ellipse" || tool === "star" ? "is-active" : ""} onClick={() => { chooseTool(shapeTool); setShapeMenuOpen((current) => !current); }} disabled={!canEdit} title="Фигуры"><ActiveShapeIcon /></button>
          <div className="board-shape-picker-menu" aria-label="Выберите фигуру">
            {([{ kind: "rectangle", label: "Прямоугольник", Icon: Square }, { kind: "ellipse", label: "Эллипс", Icon: Circle }, { kind: "star", label: "Звезда", Icon: Star }] as const).map(({ kind, label, Icon }) => <button className={shapeTool === kind ? "is-active" : ""} key={kind} onClick={() => { setShapeTool(kind); chooseTool(kind); setShapeMenuOpen(false); }} title={label} aria-label={label}><Icon /></button>)}
          </div>
        </div>
        <button className={tool === "line" ? "is-active" : ""} onClick={() => chooseTool("line")} disabled={!canEdit} title="Линия (L)"><Minus /></button>
        <button className={tool === "arrow" ? "is-active" : ""} onClick={() => chooseTool("arrow")} disabled={!canEdit} title="Стрелка (A)"><ArrowRight /></button>
        <button className={tool === "code" ? "is-active" : ""} onClick={() => chooseTool("code")} disabled={!canEdit} title="Блок кода (C)"><Code2 /></button>
        <button onClick={() => { setSelection(""); imageInputRef.current?.click(); }} disabled={!canEdit} title="Изображение"><ImagePlus /></button>
        {owner && <button className={backgroundOpen ? "is-active" : ""} onClick={() => setBackgroundOpen((value) => !value)} title="Фон доски"><Grid2X2 /></button>}
      </div>
      <input ref={imageInputRef} className="board-hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} />
      <input ref={fileInputRef} className="board-hidden-input" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBoardFile(file); event.target.value = ""; }} />
      {selectedTextValues && !textDraft && <TextFormattingToolbar values={selectedTextValues} onChange={updateSelectedText} className="board-text-actions" />}
      {!editorDraft && selectedIds.length === 1 && selectedId && objectsRef.current.get(selectedId)?.kind === "code" && <div className="board-code-actions" onPointerDown={(event) => event.stopPropagation()}>
        <select value={(objectsRef.current.get(selectedId)!.payload as CodePayload).language} onChange={(event) => setCodeLanguage(objectsRef.current.get(selectedId)!, event.target.value as CodePayload["language"])} aria-label="Язык кода"><option value="python">Python</option><option value="cpp">C++</option><option value="javascript">JavaScript</option><option value="pascal">Pascal</option></select>
        <button onClick={() => void navigator.clipboard.writeText((objectsRef.current.get(selectedId)!.payload as CodePayload).code)}><Copy />Копировать</button>
        <button onClick={() => { const object = objectsRef.current.get(selectedId)!; editObjectAt((object.minX + object.maxX) / 2, (object.minY + object.maxY) / 2); }}><Code2 />Изменить</button>
      </div>}
      {!editorDraft && selectedFile && <div className="board-file-actions" onPointerDown={(event) => event.stopPropagation()}><strong title={selectedFile.name}>{selectedFile.name}</strong><button onClick={() => window.open(`${selectedFile.src}${shareToken ? `?share=${encodeURIComponent(shareToken)}` : ""}`, "_blank", "noopener,noreferrer")}><Eye />Просмотреть</button><button onClick={() => window.open(`${selectedFile.src}?download=${encodeURIComponent(selectedFile.name)}${shareToken ? `&share=${encodeURIComponent(shareToken)}` : ""}`, "_blank", "noopener,noreferrer")}><Download />Скачать</button></div>}
      {!editorDraft && selectedIds.length === 1 && selectedId && <div className="board-layer-actions" onPointerDown={(event) => event.stopPropagation()}><span><Layers />Слои</span><button onClick={() => moveLayer("back")} title="На задний план" aria-label="На задний план"><ChevronsDown /><small>В самый низ</small></button><button onClick={() => moveLayer("backward")} title="На слой ниже" aria-label="На слой ниже"><ArrowDown /><small>Ниже</small></button><button onClick={() => moveLayer("forward")} title="На слой выше" aria-label="На слой выше"><ArrowUp /><small>Выше</small></button><button onClick={() => moveLayer("front")} title="На передний план" aria-label="На передний план"><ChevronsUp /><small>В самый верх</small></button></div>}
      {pasteSuggestion && <div className="board-paste-suggestion" onPointerDown={(event) => event.stopPropagation()}><span>Похоже на код</span><button onClick={() => { addCode(pasteSuggestion.x, pasteSuggestion.y, pasteSuggestion.text); setPasteSuggestion(null); }}>Вставить как код</button><button onClick={() => { addText(pasteSuggestion.x, pasteSuggestion.y, pasteSuggestion.text); setPasteSuggestion(null); }}>Как текст</button></div>}
      {textDraft && textDraftScreen && <div className={`board-inline-text ${textDraft.autoWidth ? "is-auto-width" : ""} ${textDraftScreen.top < 110 ? "is-toolbar-below" : ""}`} style={{ left: textDraftScreen.left, top: textDraftScreen.top, width: textDraft.autoWidth ? Math.max(44, textDraftScreen.width) : Math.max(180, textDraftScreen.width), height: Math.max(44, textDraftScreen.height, textDraftPreviewHeight * viewportRef.current.zoom) }} onPointerDown={(event) => event.stopPropagation()} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commitEditor(); }}>
        <TextFormattingToolbar values={{ ...textDraft, fontSize: draftSelectionFormat?.fontSize ?? textDraft.fontSize }} onChange={updateTextDraftStyle} />
        <div className="board-inline-text-preview" style={{ background: board.backgroundColor, color: textDraft.color, fontFamily: textDraft.fontFamily === "pribambas" ? '"Pribambas", cursive' : textDraft.fontFamily === "mono" ? "var(--font-geist-mono)" : "var(--font-geist-sans)", fontSize: textDraft.fontSize * viewportRef.current.zoom, fontStyle: textDraft.fontStyle, fontWeight: textDraft.fontWeight, lineHeight: `${textDraftLineSize * 1.3 * viewportRef.current.zoom}px`, textAlign: textDraft.textAlign, whiteSpace: textDraft.autoWidth ? "pre" : "pre-wrap" }} aria-hidden="true">{formattedTextPreview(textDraft.value, textDraft.formats, viewportRef.current.zoom)}</div>
        <textarea ref={textEditorRef} onSelect={() => setSelectionRevision((value) => value + 1)} autoFocus wrap={textDraft.autoWidth ? "off" : "soft"} value={textDraft.value} onChange={(event) => setEditorDraft((current) => current?.kind === "text" ? { ...current, value: event.target.value.slice(0, 20_000), formats: shiftTextFormats(current.value, event.target.value.slice(0, 20_000), current.formats) } : current)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditorDraft(null); } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); commitEditor(); } }} placeholder="Введите текст" aria-label="Текст на доске" style={{ background: "transparent", caretColor: textDraft.color, color: "transparent", fontFamily: textDraft.fontFamily === "pribambas" ? '"Pribambas", cursive' : textDraft.fontFamily === "mono" ? "var(--font-geist-mono)" : "var(--font-geist-sans)", fontSize: textDraft.fontSize * viewportRef.current.zoom, fontStyle: textDraft.fontStyle, fontWeight: textDraft.fontWeight, lineHeight: 1.3, textAlign: textDraft.textAlign }} />
      </div>}
      {editorDraft?.kind === "code" && <div className="board-editor-layer" onPointerDown={(event) => event.stopPropagation()}><form className="board-object-editor" onSubmit={(event) => { event.preventDefault(); commitEditor(); }}><strong>{editorDraft.objectId ? "Изменить код" : "Добавить код"}</strong><select value={editorDraft.language} onChange={(event) => setEditorDraft((current) => current?.kind === "code" ? { ...current, language: event.target.value as CodePayload["language"] } : current)}><option value="python">Python</option><option value="cpp">C++</option><option value="javascript">JavaScript</option><option value="pascal">Pascal</option></select><textarea autoFocus value={editorDraft.value} onChange={(event) => setEditorDraft((current) => current?.kind === "code" ? { ...current, value: event.target.value } : current)} onKeyDown={(event) => { if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey) return; event.preventDefault(); const textarea = event.currentTarget; const start = textarea.selectionStart; const end = textarea.selectionEnd; const insertion = indentationAfterEnter(editorDraft.value, start, editorDraft.language); const nextValue = `${editorDraft.value.slice(0, start)}${insertion}${editorDraft.value.slice(end)}`; setEditorDraft({ ...editorDraft, value: nextValue }); window.requestAnimationFrame(() => { textarea.selectionStart = textarea.selectionEnd = start + insertion.length; }); }} maxLength={50_000} placeholder={"for i in range(10):\n    print(i)"} /><div><button type="button" onClick={() => setEditorDraft(null)}>Отмена</button><button type="submit" disabled={!editorDraft.value.trim()}>{editorDraft.objectId ? "Сохранить" : "Добавить"}</button></div></form></div>}
      {backgroundOpen && owner && <div className="board-background-menu" onPointerDown={(event) => event.stopPropagation()} onPointerLeave={() => setBackgroundOpen(false)}>
        <strong>Цвет фона</strong>
        <div className="board-background-colors">{[{ color: BRAND_LIGHT, label: "Светлый" }, { color: BRAND_DARK, label: "Тёмный" }].map((item) => <button className={board.backgroundColor === item.color ? "is-active" : ""} onClick={() => { onBackground(board.backgroundType, item.color); collaborationRef.current?.sendBackground(board.backgroundType, item.color); setColor(item.color === BRAND_DARK ? BRAND_LIGHT : BRAND_DARK); }} key={item.color} aria-label={`${item.label} фон`} aria-pressed={board.backgroundColor === item.color}><span style={{ background: item.color }} />{item.label}</button>)}</div>
        <strong>Разметка</strong>
        <div className="board-background-patterns">{([{ type: "plain", label: "Без разметки" }, { type: "grid", label: "Клетка" }, { type: "ruled", label: "Линии" }, { type: "dots", label: "Точки" }] as const).map((item) => <button className={board.backgroundType === item.type ? "is-active" : ""} onClick={() => { onBackground(item.type, board.backgroundColor); collaborationRef.current?.sendBackground(item.type, board.backgroundColor); }} key={item.type} aria-pressed={board.backgroundType === item.type}><span className={`is-${item.type}`} />{item.label}</button>)}</div>
      </div>}
      {canEdit && (tool === "pen" || tool === "eraser" || tool === "rectangle" || tool === "ellipse" || tool === "star" || tool === "line" || tool === "arrow") && <div className="board-tool-options" onPointerDown={(event) => event.stopPropagation()}>
        {tool !== "eraser" && <div className="board-colors">{COLORS.map((item) => <button key={item} className={color === item ? "is-active" : ""} style={{ background: item }} onClick={() => setColor(item)} aria-label={`Цвет ${item}`} />)}</div>}
        {tool === "pen" && <label><span>{penSize} px</span><input aria-label="Толщина пера" type="range" min="2" max="24" value={penSize} onChange={(event) => changePenSize(Number(event.target.value))} /></label>}
        {tool === "eraser" && <div className="board-segmented"><button className={eraserMode === "stroke" ? "is-active" : ""} onClick={() => setEraserMode("stroke")} title="Стереть целый рукописный штрих">Штрих</button><button className={eraserMode === "area" ? "is-active" : ""} onClick={() => setEraserMode("area")} title="Стереть часть рукописи">Часть линии</button><button className={eraserMode === "object" ? "is-active" : ""} onClick={() => setEraserMode("object")} title="Удалить изображение, фигуру, текст или код">Объекты</button></div>}
      </div>}
      {saveState !== "saved" && <div className={`board-save-state is-${saveState}`}>{saveState === "saving" ? `Сохраняем${pendingCount ? ` · ${pendingCount}` : ""}` : `Нет связи${pendingCount ? ` · ${pendingCount} в очереди` : ""}`}</div>}
      <div className={`board-presence is-${realtimeState}`} onPointerDown={(event) => event.stopPropagation()}>
        <span>{realtimeState === "connected" ? "В эфире" : realtimeState === "connecting" ? "Подключаемся" : "Без realtime"}</span>
        {participants.slice(0, 6).map((participant) => <i title={participant.name} key={participant.clientId}>{participant.name.trim().charAt(0).toUpperCase() || "•"}</i>)}
      </div>
      <div ref={cursorLayerRef} className="board-cursor-layer" aria-hidden="true">{Object.values(remoteCursors).map((cursor) => <span data-board-cursor-id={cursor.clientId} key={cursor.clientId}><MousePointer2 /><b>{cursor.name}</b></span>)}</div>
      <div className="board-history-controls" onPointerDown={(event) => event.stopPropagation()}><button onClick={undo} disabled={!historyState.undo || !canEdit} title="Отменить"><Undo2 /></button><button onClick={redo} disabled={!historyState.redo || !canEdit} title="Повторить"><Redo2 /></button><i /><button onClick={() => setTaskSearchOpen(true)} disabled={!canEdit} title="Вставить задание" aria-label="Найти задание"><Search /></button><button onClick={() => fileInputRef.current?.click()} disabled={!canEdit} title="Загрузить файл до 15 МБ" aria-label="Загрузить файл"><Upload /></button><button onClick={() => setHelpOpen(true)} title="Справка по доске" aria-label="Открыть справку"><CircleHelp /></button></div>
      {minimapOpen && <section id="board-minimap" className="board-minimap" aria-label="Миникарта доски" onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") setMinimapOpen(false); }}>
        <header><span>Миникарта</span><button onClick={fitContent} aria-label="Показать всё" title="Показать всё"><Maximize2 size={16} /></button><button onClick={() => setMinimapOpen(false)} aria-label="Закрыть миникарту"><X size={16} /></button></header>
        <canvas ref={minimapRef} width={480} height={320} aria-label="Обзор доски. Нажмите, чтобы переместиться" onPointerDown={(event) => { event.preventDefault(); minimapDragRef.current = { ...minimapViewportRef.current }; event.currentTarget.setPointerCapture(event.pointerId); navigateMinimap(event); }} onPointerMove={(event) => { if (minimapDragRef.current) navigateMinimap(event); }} onPointerUp={(event) => { minimapDragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); scheduleRender(); }} onPointerCancel={() => { minimapDragRef.current = null; scheduleRender(); }} />
        <p>Нажмите на область, чтобы перейти</p>
      </section>}
      <div className="board-zoom-controls" onPointerDown={(event) => event.stopPropagation()}><button onClick={() => changeZoom(1 / 1.2)} aria-label="Уменьшить"><Minus /></button><button onClick={() => { const size = sizeRef.current; viewportRef.current = { x: size.width / 2, y: size.height / 2, zoom: 1 }; setZoomLabel(100); scheduleRender(); }}>{zoomLabel}%</button><button onClick={() => changeZoom(1.2)} aria-label="Увеличить"><Plus /></button><button onClick={() => setMinimapOpen((open) => !open)} className={minimapOpen ? "is-active" : ""} aria-label="Миникарта" title="Миникарта" aria-expanded={minimapOpen} aria-controls="board-minimap"><MapIcon /></button></div>
      {(permission === "view" || phoneReadOnly) && <div className="board-view-badge">{phoneReadOnly && permission === "edit" ? "На телефоне — режим просмотра" : "Режим просмотра"}</div>}
      {message && <div key={message} className="board-toast is-error" role="status" onPointerDown={(event) => event.stopPropagation()}>{message}<button type="button" onClick={() => setMessage("")} aria-label="Закрыть уведомление"><X /></button></div>}
      {taskSearchOpen && <div className="board-task-search-layer" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setTaskSearchOpen(false); }}><form className="board-task-search" onSubmit={(event) => { event.preventDefault(); void insertTask(); }}><button type="button" onClick={() => setTaskSearchOpen(false)} aria-label="Закрыть"><X /></button><span>База EGEGE</span><h2>Вставить задание</h2><p>Введите ID задания. Карточку можно двигать, менять её размер и копировать текст.</p><label><Search /><input autoFocus inputMode="numeric" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value.replace(/\D/g, "").slice(0, 20))} placeholder="Например, 31359" /></label><button type="submit" disabled={!taskSearch || taskSearching}>{taskSearching ? "Ищем…" : "Найти и вставить"}</button><small>Enter — вставить</small></form></div>}
      {helpOpen && <BoardHelp onClose={() => setHelpOpen(false)} />}
      <span className="sr-only" aria-live="polite">{selectedId ? "Объект выбран" : ""}</span>
    </div>
  );
}
