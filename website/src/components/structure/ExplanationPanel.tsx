"use client";

import { motion } from "framer-motion";
import type { DetectionExplanation } from "@/lib/types";
import { Sparkles } from "lucide-react";

const FACTORS: { key: keyof Pick<DetectionExplanation, "edgeDensity" | "contrastDelta" | "textureAnomaly">; label: string }[] = [
  { key: "edgeDensity", label: "Edge density" },
  { key: "contrastDelta", label: "Contrast delta" },
  { key: "textureAnomaly", label: "Texture anomaly" },
];

/**
 * "Explain this detection" — breaks the model's confidence down into the
 * factors that drove it, plus similar training examples, so a non-ML
 * reviewer (municipal safety officer, not an engineer) has a reason to
 * trust the flag beyond "the AI said so."
 */
export function ExplanationPanel({ explanation }: { explanation: DetectionExplanation }) {
  return (
    <div className="space-y-4 rounded-lg border border-border/40 bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Why the model flagged this
      </div>

      <div className="space-y-3">
        {FACTORS.map((f) => (
          <div key={f.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium">{Math.round(explanation[f.key] * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
              <motion.div
                className="h-full rounded-pill bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${explanation[f.key] * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Matched training patterns</p>
        <ul className="space-y-1">
          {explanation.matchedTrainingPatterns.map((p) => (
            <li key={p} className="text-xs text-muted-foreground">
              · {p}
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-border/40 pt-3 text-xs text-muted-foreground">{explanation.notes}</p>
    </div>
  );
}
