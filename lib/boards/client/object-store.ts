import type { BoardBounds, BoardObject, BoardObjectKind } from "../types";

const CELL_SIZE = 512;
const MAX_OBJECT_CELLS = 256;
const MAX_QUERY_CELLS = 4096;

function overlaps(object: BoardBounds, bounds: BoardBounds) {
  return object.maxX >= bounds.minX && object.minX <= bounds.maxX
    && object.maxY >= bounds.minY && object.minY <= bounds.maxY;
}

function normalizedCells(bounds: BoardBounds) {
  const minCellX = Math.floor(bounds.minX / CELL_SIZE); const maxCellX = Math.floor(bounds.maxX / CELL_SIZE);
  const minCellY = Math.floor(bounds.minY / CELL_SIZE); const maxCellY = Math.floor(bounds.maxY / CELL_SIZE);
  return { minCellX, maxCellX, minCellY, maxCellY, count: (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1) };
}

function cellKey(x: number, y: number) { return `${x}:${y}`; }

/** Map-compatible board storage with a grid index for viewport and pointer queries. */
export class BoardObjectStore extends Map<string, BoardObject> {
  private readonly cells = new Map<string, Set<string>>();
  private readonly memberships = new Map<string, string[] | null>();
  private readonly oversized = new Set<string>();
  private readonly insertionOrder = new Map<string, number>();
  private nextInsertionOrder = 0;
  private orderedCache: BoardObject[] | null = null;

  constructor(objects?: Iterable<BoardObject>) {
    super();
    if (objects) for (const object of objects) this.set(object.id, object);
  }

  private unindex(id: string) {
    const membership = this.memberships.get(id);
    if (membership === null) this.oversized.delete(id);
    else if (membership) for (const key of membership) {
      const ids = this.cells.get(key); ids?.delete(id); if (ids?.size === 0) this.cells.delete(key);
    }
    this.memberships.delete(id);
  }

  private index(object: BoardObject) {
    const range = normalizedCells(object);
    if (range.count > MAX_OBJECT_CELLS) {
      this.oversized.add(object.id); this.memberships.set(object.id, null); return;
    }
    const keys: string[] = [];
    for (let x = range.minCellX; x <= range.maxCellX; x += 1) for (let y = range.minCellY; y <= range.maxCellY; y += 1) {
      const key = cellKey(x, y); const ids = this.cells.get(key) ?? new Set<string>();
      ids.add(object.id); this.cells.set(key, ids); keys.push(key);
    }
    this.memberships.set(object.id, keys);
  }

  override set(id: string, object: BoardObject) {
    if (this.has(id)) this.unindex(id);
    else this.insertionOrder.set(id, this.nextInsertionOrder++);
    super.set(id, object); this.index(object); this.orderedCache = null;
    return this;
  }

  override delete(id: string) {
    if (!this.has(id)) return false;
    this.unindex(id); this.insertionOrder.delete(id); this.orderedCache = null;
    return super.delete(id);
  }

  override clear() {
    super.clear(); this.cells.clear(); this.memberships.clear(); this.oversized.clear(); this.insertionOrder.clear(); this.orderedCache = null;
  }

  private compare = (a: BoardObject, b: BoardObject) => a.zIndex - b.zIndex || a.createdAt - b.createdAt
    || (this.insertionOrder.get(a.id) ?? 0) - (this.insertionOrder.get(b.id) ?? 0);

  sorted() {
    this.orderedCache ??= Array.from(this.values()).sort(this.compare);
    return this.orderedCache;
  }

  visible(bounds: BoardBounds, kinds?: ReadonlySet<BoardObjectKind>) {
    const range = normalizedCells(bounds);
    if (range.count > MAX_QUERY_CELLS) {
      return this.sorted().filter((object) => (!kinds || kinds.has(object.kind)) && overlaps(object, bounds));
    }
    const ids = new Set(this.oversized);
    for (let x = range.minCellX; x <= range.maxCellX; x += 1) for (let y = range.minCellY; y <= range.maxCellY; y += 1) {
      for (const id of this.cells.get(cellKey(x, y)) ?? []) ids.add(id);
    }
    const result: BoardObject[] = [];
    for (const id of ids) {
      const object = this.get(id);
      if (object && (!kinds || kinds.has(object.kind)) && overlaps(object, bounds)) result.push(object);
    }
    return result.sort(this.compare);
  }

  topFirst(bounds: BoardBounds, kinds?: ReadonlySet<BoardObjectKind>) {
    return this.visible(bounds, kinds).reverse();
  }

  maxZIndex() { return this.sorted().at(-1)?.zIndex ?? 0; }
}
