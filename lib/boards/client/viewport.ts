import type { BoardBounds } from "../types";

export type BoardViewport = { x: number; y: number; zoom: number };
export type ScreenPoint = { x: number; y: number };
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 16;

export function wheelZoomFactor(delta: number, precise = false) {
  return Math.exp(-Math.max(-100, Math.min(100, delta)) * (precise ? .001 : .008));
}

export function screenToWorld(point: ScreenPoint, viewport: BoardViewport): ScreenPoint {
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

export function worldToScreen(point: ScreenPoint, viewport: BoardViewport): ScreenPoint {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

export function zoomAt(viewport: BoardViewport, screen: ScreenPoint, factor: number): BoardViewport {
  const world = screenToWorld(screen, viewport);
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * factor));
  return { x: screen.x - world.x * zoom, y: screen.y - world.y * zoom, zoom };
}

export function fitBounds(bounds: BoardBounds, width: number, height: number, padding = 80): BoardViewport {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const zoom = Math.max(MIN_ZOOM, Math.min(1.5, Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight)));
  return {
    x: (width - contentWidth * zoom) / 2 - bounds.minX * zoom,
    y: (height - contentHeight * zoom) / 2 - bounds.minY * zoom,
    zoom,
  };
}
