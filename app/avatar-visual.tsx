import type { CSSProperties } from "react";

export function animatedAvatarNumber(value: string) {
  const match = /^lani:(\d{1,3})$/.exec(value);
  return match ? Number(match[1]) : null;
}

export default function AvatarVisual({
  value,
  animated = true,
  className = "",
}: {
  value: string;
  animated?: boolean;
  className?: string;
}) {
  const number = animatedAvatarNumber(value);
  if (!number) return <span className={`avatar-emoji ${className}`.trim()}>{value}</span>;
  const poster = `/avatar-emotions/lani-${number}-poster.webp`;
  const source = animated ? `/avatar-emotions/lani-${number}.webp` : poster;
  return (
    <picture className={`avatar-visual ${className}`.trim()} style={{ "--avatar-number": number } as CSSProperties}>
      {animated && <source media="(prefers-reduced-motion: reduce)" srcSet={poster} />}
      <img src={source} alt="" loading="lazy" draggable={false} />
    </picture>
  );
}
