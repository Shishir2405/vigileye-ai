import { Injectable, NotFoundException } from "@nestjs/common";
import { Structure } from "./structure.entity";
import { Severity, StructureType } from "../common/enums";

// In-memory seed data standing in for the Postgres+PostGIS repository.
// Shapes mirror website/src/lib/mock-data.ts 1:1 so the frontend's move from
// mocks to live GraphQL queries is a drop-in swap.
const SEED: Structure[] = [
  { id: "str-001", name: "Riverside Bridge", type: StructureType.BRIDGE, lat: 37.7955, lng: -122.3937, riskLevel: Severity.CRITICAL, lastInspected: "2026-08-12", activeDetections: 4 },
  { id: "str-002", name: "North Dam Spillway", type: StructureType.DAM, lat: 37.9101, lng: -122.271, riskLevel: Severity.HIGH, lastInspected: "2026-07-30", activeDetections: 2 },
  { id: "str-003", name: "City Hall Parking Structure", type: StructureType.BUILDING, lat: 37.7793, lng: -122.4192, riskLevel: Severity.MEDIUM, lastInspected: "2026-08-01", activeDetections: 3 },
  { id: "str-004", name: "Harbor Tunnel — East Bore", type: StructureType.TUNNEL, lat: 37.808, lng: -122.4103, riskLevel: Severity.LOW, lastInspected: "2026-08-15", activeDetections: 1 },
  { id: "str-005", name: "Union Ave Overpass", type: StructureType.BRIDGE, lat: 37.7605, lng: -122.4194, riskLevel: Severity.MEDIUM, lastInspected: "2026-06-22", activeDetections: 2 },
];

@Injectable()
export class StructuresService {
  private structures: Structure[] = SEED;

  findAll(): Structure[] {
    return this.structures;
  }

  findOne(id: string): Structure {
    const found = this.structures.find((s) => s.id === id);
    if (!found) throw new NotFoundException(`Structure ${id} not found`);
    return found;
  }

  /** Called by SeverityTrackingService-equivalent logic once a detection's severity is scored. */
  bumpRisk(id: string, riskLevel: Severity): Structure {
    const s = this.findOne(id);
    s.riskLevel = riskLevel;
    s.activeDetections += 1;
    return s;
  }
}
