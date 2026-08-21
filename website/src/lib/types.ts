export type Severity = "low" | "medium" | "high" | "critical";

export interface Structure {
  id: string;
  name: string;
  type: "bridge" | "dam" | "building" | "tunnel";
  lat: number;
  lng: number;
  riskLevel: Severity;
  lastInspected: string; // ISO date
  activeDetections: number;
  /** 1 (low) - 3 (high) — how critical this structure is if it fails (traffic volume, population served, etc). Used by the budget simulator's priority score. */
  criticalityWeight: 1 | 2 | 3;
  /** Zone/district id, for the risk heatmap aggregation. */
  zoneId: string;
}

export interface Detection {
  id: string;
  structureId: string;
  imageUrl: string;
  annotatedImageUrl: string;
  previousImageUrl?: string; // most recent prior inspection's photo of the same location, for the before/after slider
  crackType: "diagonal" | "vertical" | "horizontal" | "map" | "hairline";
  widthMm: number;
  lengthCm: number;
  severity: Severity;
  confidence: number; // 0-1
  location: string; // e.g. "Pier 3, west face"
  capturedAt: string;
  capturedBy: "web" | "mobile" | "uav" | "fixed-camera";
  measurementSource?: "segmentation" | "bbox-heuristic";
  explanation?: DetectionExplanation;
}

/** "Explain this detection" — Feature: model confidence breakdown for non-ML reviewers. */
export interface DetectionExplanation {
  edgeDensity: number; // 0-1, how much edge/contrast activity the model found in the region
  contrastDelta: number; // 0-1, local contrast vs. surrounding surface
  textureAnomaly: number; // 0-1, deviation from the learned "normal concrete" texture
  matchedTrainingPatterns: string[]; // human-readable descriptions of similar training examples
  notes: string;
}

export interface SeverityMeasurement {
  date: string;
  widthMm: number;
}

export interface Forecast {
  detectionId: string;
  criticalThresholdMm: number;
  projectedCriticalDate: string;
  growthRateMmPerMonth: number;
  confidence: "low" | "medium" | "high";
}

export interface RepairBrief {
  detectionId: string;
  summary: string;
  recommendedAction: string;
  recommendedTimeframeDays: number;
  generatedAt: string;
}

export interface Alert {
  id: string;
  structureId: string;
  structureName: string;
  detectionId: string;
  severity: Severity;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

/** Budget simulator — one ranked repair item derived from an alert + its forecast + structure criticality. */
export interface BudgetItem {
  structureId: string;
  structureName: string;
  detectionId: string;
  severity: Severity;
  priorityScore: number; // severity x urgency (inverse time-to-critical) x structure criticality
  estimatedCostUsd: number;
  projectedCriticalDate?: string;
}

/** Inspector coverage / leaderboard — field-inspector persona. */
export interface Inspector {
  id: string;
  name: string;
  surveysThisMonth: number;
  structuresCovered: number;
}

export interface ZoneRisk {
  zoneId: string;
  zoneName: string;
  lat: number;
  lng: number;
  aggregateRiskScore: number; // 0-100, weighted by structure count x severity
  structureCount: number;
}
