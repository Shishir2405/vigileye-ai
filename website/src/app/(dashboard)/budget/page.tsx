"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBudgetItems } from "@/lib/mock-data";
import { SEVERITY_COLOR_CLASS, SEVERITY_LABEL, cn, formatDate } from "@/lib/utils";

/**
 * Budget simulator — ranks every active alert by priorityScore (severity x
 * urgency-from-forecast x structure criticality) and rolls up an estimated
 * near-term repair budget, so a non-technical asset manager can go from
 * "here are our alerts" to "here's what to fund first and roughly what it
 * costs" without doing the math themselves.
 */
export default function BudgetPage() {
  const items = computeBudgetItems().sort((a, b) => b.priorityScore - a.priorityScore);
  const totalCost = items.reduce((sum, i) => sum + i.estimatedCostUsd, 0);
  const maxScore = Math.max(...items.map((i) => i.priorityScore), 1);

  return (
    <>
      <Topbar title="Budget Simulator" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="eyebrow mb-1">Active repair items</p>
              <p className="text-2xl font-semibold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="eyebrow mb-1">Estimated near-term budget</p>
              <p className="text-2xl font-semibold text-primary">${totalCost.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="eyebrow mb-1">Top priority</p>
              <p className="truncate text-2xl font-semibold">{items[0]?.structureName ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repair priority ranking</CardTitle>
            <CardDescription>priority = severity × urgency (time-to-critical) × structure criticality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <motion.div
                key={item.detectionId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/structures/${item.structureId}`}
                  className="flex items-center gap-4 rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">#{i + 1}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-pill border px-2 py-0.5 text-xs font-medium", SEVERITY_COLOR_CLASS[item.severity])}>
                        {SEVERITY_LABEL[item.severity]}
                      </span>
                      <span className="text-sm font-medium">{item.structureName}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-pill bg-muted">
                      <motion.div
                        className="h-full rounded-pill bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.priorityScore / maxScore) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 + 0.1 }}
                      />
                    </div>
                    {item.projectedCriticalDate && (
                      <p className="mt-1 text-xs text-muted-foreground">critical by {formatDate(item.projectedCriticalDate)}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">${item.estimatedCostUsd.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">score {item.priorityScore}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
