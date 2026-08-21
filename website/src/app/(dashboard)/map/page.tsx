"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { StructureMap, type MapView } from "@/components/map/StructureMap";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockStructures, mockZoneRisks } from "@/lib/mock-data";

export default function MapPage() {
  // TODO: replace with useQuery(QUERIES.structures) once dashboard-api is live
  const structures = mockStructures;
  const [view, setView] = useState<MapView>("pins");

  return (
    <>
      <Topbar title="Live Structure Map" />
      <div className="flex items-center justify-end border-b border-border/30 px-4 py-2 md:px-6">
        <Tabs value={view} onValueChange={(v) => setView(v as MapView)}>
          <TabsList>
            <TabsTrigger value="pins">Structures</TabsTrigger>
            <TabsTrigger value="heatmap">Risk heatmap</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1">
        <StructureMap structures={structures} zones={mockZoneRisks} view={view} />
      </div>
    </>
  );
}
