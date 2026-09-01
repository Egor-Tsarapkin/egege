import { communityDb } from "@/lib/community-server";
import { decodeStrokePoints, encodeStrokePoints, strokeBounds } from "./stroke-codec";
import { ensureBoardSchema, newBoardObjectId } from "./server";
import type {
  BoardBounds,
  BoardObject,
  BoardObjectKind,
  BoardObjectPayload,
  CodeLanguage,
  StrokePayload,
} from "./types";

export type BoardMutation = {
  id: string;
  type: "create" | "update" | "delete";
  object?: unknown;
  objectId?: string;
};

export type AppliedBoardMutation = {
  id: string;
  type: BoardMutation["type"];
  sequence: number;
  object: BoardObject | null;
  objectId: string;
};

type ObjectRow = {
  object_id: string;
  kind: BoardObjectKind;
  version: number;
  z_index: number;
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
  payload_json: string;
  stroke_data: ArrayBuffer | Uint8Array | null;
  created_by: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

const OBJECT_ID = /^obj_[a-f0-9]{24}$/;
const OPERATION_ID = /^op_[a-zA-Z0-9_-]{12,80}$/;
const MAX_COORDINATE = 10_000_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_CODE_LENGTH = 50_000;

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coordinate(value: unknown) {
  return Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, finite(value)));
}

function dimension(value: unknown, fallback: number, maximum = 100_000) {
  return Math.max(1, Math.min(maximum, finite(value, fallback)));
}

function color(value: unknown, fallback = "#161513") {
  return typeof value === "string" && /^#[a-fA-F0-9]{6}$/.test(value)
    ? value.toLowerCase()
    : fallback;
}

function boundsFromRect(x: number, y: number, width: number, height: number): BoardBounds {
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function cleanStroke(value: Record<string, unknown>) {
  if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 20_000) {
    throw new Error("Штрих должен содержать от 2 до 20 000 точек");
  }
  const points = value.points.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Некорректная точка штриха");
    const point = item as Record<string, unknown>;
    return {
      x: coordinate(point.x),
      y: coordinate(point.y),
      pressure: Math.max(0, Math.min(1, finite(point.pressure, 0.5))),
      time: Math.max(0, Math.round(finite(point.time, index))),
    };
  });
  const payload: StrokePayload = {
    color: color(value.color),
    size: dimension(value.size, 4, 96),
    points,
  };
  return { payload, bounds: strokeBounds(points, payload.size * 1.25) };
}

function cleanObjectPayload(kind: BoardObjectKind, value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Некорректный объект доски");
  const input = value as Record<string, unknown>;
  if (kind === "stroke") return cleanStroke(input);
  if (kind === "text") {
    const x = coordinate(input.x);
    const y = coordinate(input.y);
    const width = dimension(input.width, 280);
    const height = dimension(input.height, 80);
    return {
      payload: {
        text: String(input.text ?? "").slice(0, MAX_TEXT_LENGTH),
        color: color(input.color),
        fontSize: dimension(input.fontSize, 24, 240),
        fontFamily: input.fontFamily === "mono" || input.fontFamily === "pribambas" ? input.fontFamily : "sans",
        fontWeight: input.fontWeight === 700 ? 700 : 500,
        fontStyle: input.fontStyle === "italic" ? "italic" : "normal",
        textAlign: input.textAlign === "center" || input.textAlign === "right" ? input.textAlign : "left",
        autoWidth: input.autoWidth === true,
        width,
        height,
        x,
        y,
      },
      bounds: boundsFromRect(x, y, width, height),
    };
  }
  if (kind === "rectangle" || kind === "ellipse" || kind === "star") {
    const x = coordinate(input.x);
    const y = coordinate(input.y);
    const width = dimension(input.width, 180);
    const height = dimension(input.height, 110);
    return {
      payload: { color: color(input.color), strokeWidth: dimension(input.strokeWidth, 3, 32), x, y, width, height },
      bounds: boundsFromRect(x, y, width, height),
    };
  }
  if (kind === "line" || kind === "arrow") {
    const startX = coordinate(input.startX);
    const startY = coordinate(input.startY);
    const endX = coordinate(input.endX);
    const endY = coordinate(input.endY);
    const strokeWidth = dimension(input.strokeWidth, 3, 32);
    return {
      payload: { color: color(input.color), strokeWidth, startX, startY, endX, endY },
      bounds: {
        minX: Math.min(startX, endX) - strokeWidth,
        minY: Math.min(startY, endY) - strokeWidth,
        maxX: Math.max(startX, endX) + strokeWidth,
        maxY: Math.max(startY, endY) + strokeWidth,
      },
    };
  }
  if (kind === "image") {
    const x = coordinate(input.x);
    const y = coordinate(input.y);
    const width = dimension(input.width, 480, 10_000);
    const height = dimension(input.height, 320, 10_000);
    const assetId = typeof input.assetId === "string" ? input.assetId.slice(0, 64) : "";
    if (!/^ast_[a-f0-9]{24}$/.test(assetId)) throw new Error("Изображение не загружено");
    return {
      payload: { assetId, src: `/api/boards/assets/${assetId}`, x, y, width, height },
      bounds: boundsFromRect(x, y, width, height),
    };
  }
  if (kind === "code") {
    const x = coordinate(input.x);
    const y = coordinate(input.y);
    const width = dimension(input.width, 520, 4000);
    const height = dimension(input.height, 260, 8000);
    const languages: CodeLanguage[] = ["python", "cpp", "javascript", "pascal"];
    const language = languages.includes(input.language as CodeLanguage)
      ? input.language as CodeLanguage
      : "python";
    return {
      payload: { code: String(input.code ?? "").slice(0, MAX_CODE_LENGTH), language, x, y, width, height },
      bounds: boundsFromRect(x, y, width, height),
    };
  }
  if (kind === "task") {
    const x = coordinate(input.x); const y = coordinate(input.y);
    const width = dimension(input.width, 640, 4000); const height = dimension(input.height, 360, 8000);
    const images = Array.isArray(input.images) ? input.images
      .filter((src): src is string => typeof src === "string" && (src.startsWith("/materials/") || /^https:\/\/(?:www\.)?kompege\.ru\/images\//i.test(src)))
      .slice(0, 8).map((src) => src.slice(0, 1000)) : [];
    return { payload: { taskId: String(input.taskId ?? "").slice(0, 32), number: Math.max(1, Math.min(27, Math.floor(finite(input.number, 1)))), note: String(input.note ?? "").slice(0, 200), text: String(input.text ?? "").slice(0, MAX_TEXT_LENGTH), html: String(input.html ?? "").slice(0, 120_000), images, answer: String(input.answer ?? "").slice(0, MAX_TEXT_LENGTH), fontScale: Math.max(.7, Math.min(2.4, finite(input.fontScale, 1))), x, y, width, height }, bounds: boundsFromRect(x, y, width, height) };
  }
  if (kind === "file") {
    const x = coordinate(input.x); const y = coordinate(input.y);
    const width = dimension(input.width, 360, 1200); const height = dimension(input.height, 92, 500);
    const assetId = typeof input.assetId === "string" ? input.assetId.slice(0, 64) : "";
    if (!/^ast_[a-f0-9]{24}$/.test(assetId)) throw new Error("Файл не загружен");
    return { payload: { assetId, src: `/api/boards/assets/${assetId}`, name: String(input.name ?? "Файл").slice(0, 180), mime: String(input.mime ?? "application/octet-stream").slice(0, 120), size: Math.max(0, Math.floor(finite(input.size))), x, y, width, height }, bounds: boundsFromRect(x, y, width, height) };
  }
  throw new Error("Неподдерживаемый тип объекта");
}

function rowToObject(row: ObjectRow): BoardObject {
  const payload = JSON.parse(row.payload_json) as BoardObjectPayload;
  if (row.kind === "stroke") {
    const bytes = row.stroke_data instanceof Uint8Array
      ? row.stroke_data
      : new Uint8Array(row.stroke_data ?? new ArrayBuffer(0));
    (payload as StrokePayload).points = decodeStrokePoints(bytes);
  }
  return {
    id: row.object_id,
    kind: row.kind,
    version: Number(row.version),
    zIndex: Number(row.z_index),
    minX: Number(row.min_x),
    minY: Number(row.min_y),
    maxX: Number(row.max_x),
    maxY: Number(row.max_y),
    payload,
    createdBy: row.created_by,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function operationForStorage(operation: AppliedBoardMutation) {
  const stored = structuredClone(operation) as AppliedBoardMutation & { object: (BoardObject & { payload: StrokePayload & { pointsBinary?: string } }) | null };
  if (stored.object?.kind === "stroke") {
    stored.object.payload.pointsBinary = bytesToBase64(encodeStrokePoints(stored.object.payload.points));
    stored.object.payload.points = [];
  }
  return stored;
}

function operationFromStorage(value: string) {
  const operation = JSON.parse(value) as AppliedBoardMutation & { object: (BoardObject & { payload: StrokePayload & { pointsBinary?: string } }) | null };
  if (operation.object?.kind === "stroke" && operation.object.payload.pointsBinary) {
    operation.object.payload.points = decodeStrokePoints(base64ToBytes(operation.object.payload.pointsBinary));
    delete operation.object.payload.pointsBinary;
  }
  return operation as AppliedBoardMutation;
}

export async function listBoardObjects(boardId: string, bounds?: BoardBounds) {
  await ensureBoardSchema();
  const where = bounds
    ? "AND max_x >= ? AND min_x <= ? AND max_y >= ? AND min_y <= ?"
    : "";
  const statement = communityDb().prepare(`SELECT object_id, kind, version, z_index,
    min_x, min_y, max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at
    FROM board_objects WHERE board_id = ? AND deleted_at IS NULL ${where}
    ORDER BY z_index ASC LIMIT 10000`);
  const result = bounds
    ? await statement.bind(boardId, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY).all<ObjectRow>()
    : await statement.bind(boardId).all<ObjectRow>();
  return result.results.map(rowToObject);
}

export async function listBoardOperations(boardId: string, afterSequence: number) {
  await ensureBoardSchema();
  const result = await communityDb().prepare(`SELECT sequence, payload FROM board_operations
    WHERE board_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT 2000`)
    .bind(boardId, Math.max(0, Math.floor(afterSequence)))
    .all<{ sequence: number; payload: ArrayBuffer | Uint8Array | string }>();
  return result.results.map((row) => {
    const text = typeof row.payload === "string"
      ? row.payload
      : new TextDecoder().decode(row.payload instanceof Uint8Array ? row.payload : new Uint8Array(row.payload));
    return { ...operationFromStorage(text), sequence: Number(row.sequence) };
  });
}

function cleanMutation(input: unknown): BoardMutation {
  if (!input || typeof input !== "object") throw new Error("Некорректная операция");
  const value = input as Record<string, unknown>;
  if (!OPERATION_ID.test(String(value.id ?? ""))) throw new Error("Некорректный ID операции");
  if (value.type !== "create" && value.type !== "update" && value.type !== "delete") {
    throw new Error("Некорректный тип операции");
  }
  return { id: String(value.id), type: value.type, object: value.object, objectId: String(value.objectId ?? "") };
}

async function existingOperation(boardId: string, operationId: string) {
  const row = await communityDb().prepare(`SELECT payload FROM board_operations
    WHERE board_id = ? AND operation_id = ? LIMIT 1`).bind(boardId, operationId)
    .first<{ payload: ArrayBuffer | Uint8Array | string }>();
  if (!row) return null;
  const text = typeof row.payload === "string"
    ? row.payload
    : new TextDecoder().decode(row.payload instanceof Uint8Array ? row.payload : new Uint8Array(row.payload));
  return operationFromStorage(text);
}

export async function applyBoardMutation(
  boardId: string,
  actorId: string,
  actorKind: "user" | "guest",
  input: unknown,
): Promise<AppliedBoardMutation> {
  await ensureBoardSchema();
  const mutation = cleanMutation(input);
  const duplicate = await existingOperation(boardId, mutation.id);
  if (duplicate) return duplicate;
  let objectId = mutation.objectId && OBJECT_ID.test(mutation.objectId) ? mutation.objectId : "";
  let object: BoardObject | null = null;
  let existing: ObjectRow | null = null;
  if (objectId) {
    existing = await communityDb().prepare(`SELECT object_id, kind, version, z_index, min_x, min_y,
      max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at
      FROM board_objects WHERE board_id = ? AND object_id = ? LIMIT 1`)
      .bind(boardId, objectId).first<ObjectRow>();
  }
  if (mutation.type !== "delete") {
    if (!mutation.object || typeof mutation.object !== "object") throw new Error("Объект отсутствует");
    const raw = mutation.object as Record<string, unknown>;
    const kind = raw.kind as BoardObjectKind;
    if (!["stroke", "text", "line", "arrow", "rectangle", "ellipse", "star", "image", "code", "task", "file"].includes(kind)) {
      throw new Error("Некорректный тип объекта");
    }
    if (mutation.type === "update" && (!existing || existing.deleted_at)) {
      throw new Error("Объект уже удалён");
    }
    if (mutation.type === "create") {
      objectId = typeof raw.id === "string" && OBJECT_ID.test(raw.id) ? raw.id : newBoardObjectId();
      existing = await communityDb().prepare(`SELECT object_id, kind, version, z_index, min_x, min_y,
        max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at
        FROM board_objects WHERE board_id = ? AND object_id = ?`)
        .bind(boardId, objectId).first<ObjectRow>();
      if (existing && !existing.deleted_at) throw new Error("Объект с таким ID уже существует");
    }
    const clean = cleanObjectPayload(kind, raw.payload);
    const now = Math.floor(Date.now() / 1000);
    object = {
      id: objectId,
      kind,
      version: existing ? Number(existing.version) + 1 : 1,
      zIndex: Math.max(0, Math.min(2_000_000_000, Math.floor(finite(raw.zIndex, Date.now())))),
      ...clean.bounds,
      payload: clean.payload as BoardObjectPayload,
      createdBy: existing?.created_by ?? actorId,
      createdAt: existing ? Number(existing.created_at) : now,
      updatedAt: now,
    };
  } else if (!objectId || !existing || existing.deleted_at) {
    throw new Error("Объект уже удалён");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const board = await communityDb().prepare("SELECT latest_sequence FROM boards WHERE id = ? AND deleted_at IS NULL")
      .bind(boardId).first<{ latest_sequence: number }>();
    if (!board) throw new Error("Доска не найдена");
    const sequence = Number(board.latest_sequence) + 1;
    const applied: AppliedBoardMutation = { id: mutation.id, type: mutation.type, sequence, object, objectId };
    const payloadBytes = new TextEncoder().encode(JSON.stringify(operationForStorage(applied)));
    const now = Math.floor(Date.now() / 1000);
    const statements = [
      communityDb().prepare(`INSERT INTO board_operations
        (board_id, sequence, operation_id, actor_id, actor_kind, operation_type,
         target_object_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(boardId, sequence, mutation.id, actorId, actorKind, mutation.type, objectId, payloadBytes, now),
    ];
    if (mutation.type === "delete") {
      statements.push(communityDb().prepare(`UPDATE board_objects SET deleted_at = ?, updated_at = ?, version = version + 1
        WHERE board_id = ? AND object_id = ? AND deleted_at IS NULL`).bind(now, now, boardId, objectId));
    } else if (object) {
      const payload = object.kind === "stroke"
        ? { ...(object.payload as StrokePayload), points: [] }
        : object.payload;
      const strokeData = object.kind === "stroke"
        ? encodeStrokePoints((object.payload as StrokePayload).points)
        : null;
      statements.push(communityDb().prepare(`INSERT INTO board_objects
        (board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y,
         payload_json, stroke_data, created_by, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(board_id, object_id) DO UPDATE SET
          kind=excluded.kind, version=excluded.version, z_index=excluded.z_index,
          min_x=excluded.min_x, min_y=excluded.min_y, max_x=excluded.max_x, max_y=excluded.max_y,
          payload_json=excluded.payload_json, stroke_data=excluded.stroke_data,
          updated_at=excluded.updated_at, deleted_at=NULL
        WHERE board_objects.version < excluded.version`)
        .bind(boardId, object.id, object.kind, object.version, object.zIndex,
          Math.floor(object.minX), Math.floor(object.minY), Math.ceil(object.maxX), Math.ceil(object.maxY),
          JSON.stringify(payload), strokeData, object.createdBy, object.createdAt, object.updatedAt));
    }
    statements.push(communityDb().prepare(`UPDATE boards SET latest_sequence = ?, updated_at = ?,
      object_count = object_count + ?, stroke_count = stroke_count + ?
      WHERE id = ? AND latest_sequence = ?`)
      .bind(sequence, now,
        mutation.type === "create" ? 1 : mutation.type === "delete" ? -1 : 0,
        mutation.type === "create" && object?.kind === "stroke" ? 1 : mutation.type === "delete" && existing?.kind === "stroke" ? -1 : 0,
        boardId, Number(board.latest_sequence)));
    try {
      await communityDb().batch(statements);
      return applied;
    } catch (error) {
      const duplicateAfterRace = await existingOperation(boardId, mutation.id);
      if (duplicateAfterRace) return duplicateAfterRace;
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Не удалось сохранить изменение");
}
