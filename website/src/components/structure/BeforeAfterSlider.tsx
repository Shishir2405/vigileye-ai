"use client";

import { useRef, useState } from "react";
import { GitCompareArrows } from "lucide-react";

/**
 * Drag to compare this inspection's photo against the previous one for the
 * same location, crack overlay highlighted on the "after" side. Both images
 * are placeholder blocks (mock-data.ts's `imageUrl`/`previousImageUrl` don't
 * point at real files yet) — swap in <Image> once real capture URLs exist.
 */
export function BeforeAfterSlider({
  beforeLabel = "Previous inspection",
  afterLabel = "Latest inspection",
}: {
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(50);

  function handlePointer(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, pct)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <GitCompareArrows className="h-3.5 w-3.5" />
        Drag to compare — crack growth highlighted on the right
      </div>

      <div
        ref={containerRef}
        className="relative aspect-video w-full select-none overflow-hidden rounded-md border border-border/40"
        onMouseMove={(e) => e.buttons === 1 && handlePointer(e.clientX)}
        onMouseDown={(e) => handlePointer(e.clientX)}
        onTouchMove={(e) => handlePointer(e.touches[0].clientX)}
      >
        {/* "after" layer — full width, underneath */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-severity-critical/25 to-muted text-xs text-muted-foreground">
          {afterLabel}
        </div>

        {/* "before" layer — always full-size, clipped via clip-path so its
            (centered) label never visually squashes as the slider moves. */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        >
          {beforeLabel}
        </div>

        <div className="absolute inset-y-0 flex w-0.5 items-center bg-primary" style={{ left: `${percent}%` }}>
          <div className="-ml-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md">
            <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
