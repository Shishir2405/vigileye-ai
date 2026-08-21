"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/utils";

export function SeverityTrendChart({
  history,
  criticalThresholdMm,
}: {
  history: { date: string; widthMm: number }[];
  criticalThresholdMm?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Recharts renders its <path> after mount; grab it on the next tick and
      // animate the stroke drawing in, plus a soft fade/scale for the whole
      // chart so the trend line reads as "revealed" rather than just present.
      const path = containerRef.current!.querySelector(".recharts-line-curve") as SVGPathElement | null;
      const dots = containerRef.current!.querySelectorAll(".recharts-line-dot");

      gsap.fromTo(containerRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });

      if (path) {
        const length = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.1, delay: 0.15, ease: "power2.inOut" }
        );
      }
      if (dots.length) {
        gsap.fromTo(dots, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.08, delay: 1.0, ease: "back.out(2)" });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [history]);

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="mm" />
          <Tooltip labelFormatter={formatDate} formatter={(v: number) => [`${v}mm`, "Width"]} />
          {criticalThresholdMm && (
            <ReferenceLine y={criticalThresholdMm} stroke="hsl(var(--severity-critical))" strokeDasharray="4 4" label="Critical" />
          )}
          <Line type="monotone" dataKey="widthMm" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
