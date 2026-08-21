"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { Detection } from "@/lib/types";
import { SEVERITY_COLOR_CLASS, SEVERITY_LABEL, cn, formatDate } from "@/lib/utils";

export function DetectionTimeline({
  detections,
  onSelect,
}: {
  detections: Detection[];
  onSelect?: (detection: Detection) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {detections.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card
            className={cn("transition-colors", onSelect && "cursor-pointer hover:bg-muted")}
            onClick={() => onSelect?.(d)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-16 w-16 shrink-0 rounded-md bg-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-pill border px-2 py-0.5 text-xs font-medium", SEVERITY_COLOR_CLASS[d.severity])}>
                    {SEVERITY_LABEL[d.severity]}
                  </span>
                  <span className="text-sm font-medium capitalize">{d.crackType} crack</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {d.location} · {d.widthMm}mm × {d.lengthCm}cm · {Math.round(d.confidence * 100)}% confidence
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(d.capturedAt)} · captured via {d.capturedBy}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
