"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockInspectors, mockStructures } from "@/lib/mock-data";
import { cn, formatDate } from "@/lib/utils";

function daysSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function stalenessColor(days: number): string {
  if (days > 60) return "bg-severity-critical/15 text-severity-critical border-severity-critical/30";
  if (days > 30) return "bg-severity-medium/15 text-severity-medium border-severity-medium/30";
  return "bg-severity-low/15 text-severity-low border-severity-low/30";
}

/**
 * Field-inspector persona: which structures haven't been surveyed recently
 * (staleness), and a lightweight leaderboard to gamify coverage across the
 * inspector team — addresses the PRD's "inspection cadence is too slow"
 * problem statement directly, rather than only showing detection results.
 */
export default function CoveragePage() {
  const staleness = [...mockStructures].sort((a, b) => daysSince(b.lastInspected) - daysSince(a.lastInspected));

  return (
    <>
      <Topbar title="Inspector Coverage" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Survey staleness</CardTitle>
            <CardDescription>Structures ranked by days since last inspection — the longer the gap, the higher the risk of an unnoticed crack</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {staleness.map((s, i) => {
              const days = daysSince(s.lastInspected);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.type} · last surveyed {formatDate(s.lastInspected)}</p>
                  </div>
                  <span className={cn("rounded-pill border px-2.5 py-0.5 text-xs font-medium", stalenessColor(days))}>
                    {days}d ago
                  </span>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspector leaderboard</CardTitle>
            <CardDescription>Surveys completed this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...mockInspectors]
              .sort((a, b) => b.surveysThisMonth - a.surveysThisMonth)
              .map((insp, i) => (
                <motion.div
                  key={insp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 rounded-lg border border-border/40 p-3"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{insp.name}</p>
                    <p className="text-xs text-muted-foreground">{insp.structuresCovered} structures covered</p>
                  </div>
                  <span className="text-lg font-semibold text-primary">{insp.surveysThisMonth}</span>
                </motion.div>
              ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
