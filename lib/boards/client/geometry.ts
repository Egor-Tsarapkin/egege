export function constrainedShapePoint(kind: "rectangle" | "ellipse" | "star" | "line" | "arrow", startX: number, startY: number, endX: number, endY: number, shiftKey: boolean) {
  if (!shiftKey) return { x: endX, y: endY };
  const dx = endX - startX; const dy = endY - startY;
  if (kind === "rectangle" || kind === "ellipse" || kind === "star") {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: startX + Math.sign(dx || 1) * size, y: startY + Math.sign(dy || 1) * size };
  }
  const distance = Math.hypot(dx, dy); const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: startX + Math.cos(angle) * distance, y: startY + Math.sin(angle) * distance };
}
