"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { AlertInbox, AlertInboxSkeleton } from "@/components/alerts/AlertInbox";
import { mockAlerts } from "@/lib/mock-data";
import type { Alert } from "@/lib/types";

export default function AlertsPage() {
  // TODO: replace with useQuery(QUERIES.alerts) + a WebSocket subscription to
  // severity-alerts (see backend/) for live inbox updates once wired up.
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAlerts(mockAlerts), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Topbar title="Alert Inbox" />
      <div className="min-h-0 flex-1">
        {alerts === null ? <AlertInboxSkeleton /> : <AlertInbox alerts={alerts} />}
      </div>
    </>
  );
}
