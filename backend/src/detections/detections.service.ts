import { Injectable } from "@nestjs/common";
import { Detection } from "./detection.entity";
import { CaptureSource, Severity } from "../common/enums";

const SEED: Detection[] = [
  {
    id: "det-101",
    structureId: "str-001",
    imageUrl: "/mock/crack-1-raw.jpg",
    annotatedImageUrl: "/mock/crack-1-annotated.jpg",
    crackType: "diagonal",
    widthMm: 4.8,
    lengthCm: 38,
    severity: Severity.CRITICAL,
    confidence: 0.94,
    location: "Pier 3, west face",
    capturedAt: "2026-08-18T14:32:00Z",
    capturedBy: CaptureSource.UAV,
    forecast: {
      criticalThresholdMm: 5,
      projectedCriticalDate: "2026-10-05",
      growthRateMmPerMonth: 0.15,
      confidence: "high",
    },
    repairBrief: {
      summary:
        "4.8mm diagonal crack detected on Pier 3, west face, consistent with shear stress. Growth trend projects the 5mm critical threshold will be crossed within ~7 weeks.",
      recommendedAction: "Structural engineer inspection and shoring assessment",
      recommendedTimeframeDays: 14,
      generatedAt: "2026-08-18T15:00:00Z",
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
    severity: Severity.HIGH,
    confidence: 0.88,
    location: "Spillway face, section B",
    capturedAt: "2026-08-17T09:10:00Z",
    capturedBy: CaptureSource.FIXED_CAMERA,
  },
];

@Injectable()
export class DetectionsService {
  private detections: Detection[] = SEED;

  findAll(): Detection[] {
    return this.detections;
  }

  findByStructure(structureId: string): Detection[] {
    return this.detections.filter((d) => d.structureId === structureId);
  }

  /** Called by MlModule once an inference result + severity scoring comes back. */
  create(detection: Detection): Detection {
    this.detections.push(detection);
    return detection;
  }
}
