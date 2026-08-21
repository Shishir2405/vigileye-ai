// Mock data standing in for the dashboard-api GraphQL layer until the
// NestJS backend (../backend) is wired up. Shapes match src/lib/types.ts
// 1:1 so swapping in real fetches later is a drop-in replacement.

import type { Alert, BudgetItem, Detection, Forecast, Inspector, RepairBrief, Structure, ZoneRisk } from "./types";

export const mockStructures: Structure[] = [
  {
    id: "str-001",
    name: "Riverside Bridge",
    type: "bridge",
    lat: 37.7955,
    lng: -122.3937,
    riskLevel: "critical",
    lastInspected: "2026-08-12",
    activeDetections: 4,
    criticalityWeight: 3,
    zoneId: "zone-north",
  },
  {
    id: "str-002",
    name: "North Dam Spillway",
    type: "dam",
    lat: 37.9101,
    lng: -122.271,
    riskLevel: "high",
    lastInspected: "2026-07-30",
    activeDetections: 2,
    criticalityWeight: 3,
    zoneId: "zone-north",
  },
  {
    id: "str-003",
    name: "City Hall Parking Structure",
    type: "building",
    lat: 37.7793,
    lng: -122.4192,
    riskLevel: "medium",
    lastInspected: "2026-08-01",
    activeDetections: 3,
    criticalityWeight: 2,
    zoneId: "zone-central",
  },
  {
    id: "str-004",
    name: "Harbor Tunnel — East Bore",
    type: "tunnel",
    lat: 37.808,
    lng: -122.4103,
    riskLevel: "low",
    lastInspected: "2026-08-15",
    activeDetections: 1,
    criticalityWeight: 2,
    zoneId: "zone-harbor",
  },
  {
    id: "str-005",
    name: "Union Ave Overpass",
    type: "bridge",
    lat: 37.7605,
    lng: -122.4194,
    riskLevel: "medium",
    lastInspected: "2026-06-22",
    activeDetections: 2,
    criticalityWeight: 1,
    zoneId: "zone-south",
  },
];

export const mockDetections: Detection[] = [
  {
    id: "det-101",
    structureId: "str-001",
    imageUrl: "/mock/crack-1-raw.jpg",
    annotatedImageUrl: "/mock/crack-1-annotated.jpg",
    previousImageUrl: "/mock/crack-1-previous.jpg",
    crackType: "diagonal",
    widthMm: 4.8,
    lengthCm: 38,
    severity: "critical",
    confidence: 0.94,
    location: "Pier 3, west face",
    capturedAt: "2026-08-18T14:32:00Z",
    capturedBy: "uav",
    measurementSource: "segmentation",
    explanation: {
      edgeDensity: 0.88,
      contrastDelta: 0.76,
      textureAnomaly: 0.81,
      matchedTrainingPatterns: [
        "Diagonal shear cracking near pier supports (312 similar training examples)",
        "High-contrast linear discontinuity on weathered concrete",
      ],
      notes:
        "Strong edge continuity across the full 38cm span and a sharp contrast delta against the surrounding surface drove high confidence; texture anomaly score reflects surface spalling typically seen alongside shear cracks.",
    },
  },
  {
    id: "det-102",
    structureId: "str-002",
    imageUrl: "/mock/crack-2-raw.jpg",
    annotatedImageUrl: "/mock/crack-2-annotated.jpg",
    crackType: "map",
    widthMm: 2.1,
    lengthCm: 120,
    severity: "high",
    confidence: 0.88,
    location: "Spillway face, section B",
    capturedAt: "2026-08-17T09:10:00Z",
    capturedBy: "fixed-camera",
  },
  {
    id: "det-103",
    structureId: "str-003",
    imageUrl: "/mock/crack-3-raw.jpg",
    annotatedImageUrl: "/mock/crack-3-annotated.jpg",
    crackType: "vertical",
    widthMm: 1.2,
    lengthCm: 60,
    severity: "medium",
    confidence: 0.81,
    location: "Level 2 support column, C4",
    capturedAt: "2026-08-16T16:05:00Z",
    capturedBy: "mobile",
  },
];

export const mockForecasts: Forecast[] = [
  {
    detectionId: "det-101",
    criticalThresholdMm: 5,
    projectedCriticalDate: "2026-10-05",
    growthRateMmPerMonth: 0.15,
    confidence: "high",
  },
  {
    detectionId: "det-102",
    criticalThresholdMm: 5,
    projectedCriticalDate: "2027-04-01",
    growthRateMmPerMonth: 0.09,
    confidence: "medium",
  },
];

export const mockRepairBriefs: RepairBrief[] = [
  {
    detectionId: "det-101",
    summary:
      "4.8mm diagonal crack detected on Pier 3, west face, consistent with shear stress. Growth trend projects the 5mm critical threshold will be crossed within ~7 weeks.",
    recommendedAction: "Structural engineer inspection and shoring assessment",
    recommendedTimeframeDays: 14,
    generatedAt: "2026-08-18T15:00:00Z",
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "alrt-1",
    structureId: "str-001",
    structureName: "Riverside Bridge",
    detectionId: "det-101",
    severity: "critical",
    message: "Critical crack growth detected on Pier 3 — projected critical in ~7 weeks.",
    createdAt: "2026-08-18T14:35:00Z",
    acknowledged: false,
  },
  {
    id: "alrt-2",
    structureId: "str-002",
    structureName: "North Dam Spillway",
    detectionId: "det-102",
    severity: "high",
    message: "New map cracking pattern detected in spillway section B.",
    createdAt: "2026-08-17T09:12:00Z",
    acknowledged: false,
  },
  {
    id: "alrt-3",
    structureId: "str-003",
    structureName: "City Hall Parking Structure",
    detectionId: "det-103",
    severity: "medium",
    message: "Vertical crack on support column C4 has grown 0.3mm since last inspection.",
    createdAt: "2026-08-16T16:08:00Z",
    acknowledged: true,
  },
];

export const mockSeverityHistory: Record<string, { date: string; widthMm: number }[]> = {
  "det-101": [
    { date: "2026-02-01", widthMm: 3.1 },
    { date: "2026-03-15", widthMm: 3.4 },
    { date: "2026-05-01", widthMm: 3.9 },
    { date: "2026-06-20", widthMm: 4.3 },
    { date: "2026-08-18", widthMm: 4.8 },
  ],
};

export const mockZoneRisks: ZoneRisk[] = [
  { zoneId: "zone-north", zoneName: "North District", lat: 37.85, lng: -122.33, aggregateRiskScore: 88, structureCount: 2 },
  { zoneId: "zone-central", zoneName: "Central District", lat: 37.7793, lng: -122.4192, aggregateRiskScore: 52, structureCount: 1 },
  { zoneId: "zone-harbor", zoneName: "Harbor District", lat: 37.808, lng: -122.4103, aggregateRiskScore: 24, structureCount: 1 },
  { zoneId: "zone-south", zoneName: "South District", lat: 37.7605, lng: -122.4194, aggregateRiskScore: 46, structureCount: 1 },
];

export const mockInspectors: Inspector[] = [
  { id: "insp-1", name: "Maria Chen", surveysThisMonth: 14, structuresCovered: 9 },
  { id: "insp-2", name: "David Okafor", surveysThisMonth: 11, structuresCovered: 7 },
  { id: "insp-3", name: "Priya Nair", surveysThisMonth: 8, structuresCovered: 6 },
  { id: "insp-4", name: "Tom Alvarez", surveysThisMonth: 5, structuresCovered: 4 },
];

const SEVERITY_WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Budget simulator's priority score: severity x urgency (inverse
 * time-to-critical, when a forecast exists) x structure criticality.
 * Real implementation would move this to the backend once forecasts are
 * computed server-side; kept here for now so the page works standalone.
 */
export function computeBudgetItems(): BudgetItem[] {
  return mockAlerts.map((alert): BudgetItem => {
    const structure = mockStructures.find((s) => s.id === alert.structureId);
    const forecast = mockForecasts.find((f) => f.detectionId === alert.detectionId);

    const severityWeight = SEVERITY_WEIGHT[alert.severity] ?? 1;
    const criticalityWeight = structure?.criticalityWeight ?? 1;

    let urgencyWeight = 1;
    if (forecast) {
      const monthsToCitical = Math.max(
        1,
        (new Date(forecast.projectedCriticalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
      );
      urgencyWeight = Math.min(4, 12 / monthsToCitical);
    }

    const priorityScore = Math.round(severityWeight * criticalityWeight * urgencyWeight * 10) / 10;
    // Rough cost model: base cost scaled by severity + structure criticality — a placeholder
    // for a real estimator informed by crack length/width and repair method.
    const estimatedCostUsd = Math.round((2000 + severityWeight * 4000 * criticalityWeight) / 100) * 100;

    return {
      structureId: alert.structureId,
      structureName: alert.structureName,
      detectionId: alert.detectionId,
      severity: alert.severity,
      priorityScore,
      estimatedCostUsd,
      projectedCriticalDate: forecast?.projectedCriticalDate,
    };
  });
}
