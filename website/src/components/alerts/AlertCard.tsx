"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Alert } from "@/lib/types";
import { SEVERITY_COLOR_CLASS, SEVERITY_LABEL, cn, relativeTime } from "@/lib/utils";

export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <Link href={`/structures/${alert.structureId}`}>
        <Card className={cn("transition-colors hover:bg-muted", !alert.acknowledged && "border-l-4 border-l-primary")}>
          <CardContent className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-pill border px-2 py-0.5 text-xs font-medium", SEVERITY_COLOR_CLASS[alert.severity])}>
                  {SEVERITY_LABEL[alert.severity]}
                </span>
                <span className="text-sm font-medium">{alert.structureName}</span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{alert.message}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(alert.createdAt)}</span>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
