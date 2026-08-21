import { Injectable } from "@nestjs/common";
import { Alert } from "./alert.entity";
import { Severity } from "../common/enums";

const SEED: Alert[] = [
  {
    id: "alrt-1",
    structureId: "str-001",
    structureName: "Riverside Bridge",
    detectionId: "det-101",
    severity: Severity.CRITICAL,
    message: "Critical crack growth detected on Pier 3 — projected critical in ~7 weeks.",
    createdAt: "2026-08-18T14:35:00Z",
    acknowledged: false,
  },
  {
    id: "alrt-2",
    structureId: "str-002",
    structureName: "North Dam Spillway",
    detectionId: "det-102",
    severity: Severity.HIGH,
    message: "New map cracking pattern detected in spillway section B.",
    createdAt: "2026-08-17T09:12:00Z",
    acknowledged: false,
  },
];

@Injectable()
export class AlertsService {
  private alerts: Alert[] = SEED;

  findAll(): Alert[] {
    return this.alerts;
  }

  acknowledge(id: string): Alert | undefined {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) alert.acknowledged = true;
    return alert;
  }

  /** Called when severity crosses a threshold; also the fan-out point for
   *  push/email/SMS/webhook delivery in a full notification service. */
  raise(alert: Alert): Alert {
    this.alerts.unshift(alert);
    return alert;
  }
}
