export type BoardPermission = "view" | "edit";
export type BoardBackground = "plain" | "dots" | "grid" | "ruled";
export type BoardObjectKind =
  | "stroke"
  | "text"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "star"
  | "image"
  | "code"
  | "task"
  | "file";

export type BoardSummary = {
  id: string;
  title: string;
  ownerUserId: string;
  ownerName: string;
  backgroundType: BoardBackground;
  backgroundColor: string;
  latestSequence: number;
  storageBytes: number;
  objectCount: number;
  strokeCount: number;
  createdAt: number;
  updatedAt: number;
};

export type StrokePoint = {
  x: number;
  y: number;
  pressure: number;
  time: number;
};

export type BoardBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type StrokePayload = {
  color: string;
  size: number;
  points: StrokePoint[];
};

export type TextPayload = {
  text: string;
  color: string;
  fontSize: number;
  fontFamily?: "sans" | "mono" | "pribambas";
  fontWeight?: 500 | 700;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  formats?: Array<{ start: number; end: number; color?: string; fontSize?: number }>;
  autoWidth?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ShapePayload = {
  color: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LinePayload = {
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type ImagePayload = {
  assetId: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CodeLanguage = "python" | "cpp" | "javascript" | "pascal";

export type CodePayload = {
  code: string;
  language: CodeLanguage;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TaskPayload = {
  taskId: string; number: number; note: string; text: string; html?: string; images?: string[];
  answer?: string; fontScale?: number;
  x: number; y: number; width: number; height: number;
};

export type FilePayload = {
  assetId: string; src: string; name: string; mime: string; size: number;
  x: number; y: number; width: number; height: number;
};

export type BoardObjectPayload =
  | StrokePayload
  | TextPayload
  | ShapePayload
  | LinePayload
  | ImagePayload
  | CodePayload
  | TaskPayload
  | FilePayload;

export type BoardObject = BoardBounds & {
  id: string;
  kind: BoardObjectKind;
  version: number;
  zIndex: number;
  payload: BoardObjectPayload;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type BoardAccess = {
  board: BoardSummary;
  permission: BoardPermission;
  owner: boolean;
  userId: string | null;
};

export type BoardSessionIdentity = {
  boardId: string;
  clientId: string;
  actorId: string;
  actorKind: "user" | "guest";
  displayName: string;
  permission: BoardPermission;
  expiresAt: number;
};
