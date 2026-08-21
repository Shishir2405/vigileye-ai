"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeverityTrendChart } from "@/components/structure/SeverityTrendChart";
import { DetectionTimeline } from "@/components/structure/DetectionTimeline";
import { BeforeAfterSlider } from "@/components/structure/BeforeAfterSlider";
import { ExplanationPanel } from "@/components/structure/ExplanationPanel";
import {
  mockDetections,
  mockForecasts,
  mockRepairBriefs,
  mockSeverityHistory,
  mockStructures,
} from "@/lib/mock-data";
import type { Detection } from "@/lib/types";
import { SEVERITY_COLOR_CLASS, SEVERITY_LABEL, cn, formatDate } from "@/lib/utils";

export default function StructureDetailPage({ params }: { params: { id: string } }) {
  // TODO: replace with useQuery(QUERIES.structureDetail, { id: params.id })
  const structure = mockStructures.find((s) => s.id === params.id);
  if (!structure) notFound();

  const detections = mockDetections.filter((d) => d.structureId === structure.id);
  const topDetection = detections[0];
  const history = topDetection ? mockSeverityHistory[topDetection.id] : undefined;
  const forecast = topDetection ? mockForecasts.find((f) => f.detectionId === topDetection.id) : undefined;
  const brief = topDetection ? mockRepairBriefs.find((b) => b.detectionId === topDetection.id) : undefined;

  const [selected, setSelected] = useState<Detection | null>(null);

  return (
    <>
      <Topbar title={structure.name} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className={cn("rounded-pill border px-3 py-1 text-xs font-medium", SEVERITY_COLOR_CLASS[structure.riskLevel])}>
            {SEVERITY_LABEL[structure.riskLevel]} risk
          </span>
          <span className="text-sm text-muted-foreground capitalize">{structure.type}</span>
          <span className="text-sm text-muted-foreground">· last inspected {formatDate(structure.lastInspected)}</span>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detections">Detections ({detections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Severity trend</CardTitle>
                  <CardDescription>
                    Crack width over time{topDetection ? ` — ${topDetection.location}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history ? (
                    <SeverityTrendChart history={history} criticalThresholdMm={forecast?.criticalThresholdMm} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No historical measurements yet for this structure.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time-to-critical forecast</CardTitle>
                  <CardDescription>Feature 1 — predictive risk forecasting</CardDescription>
                </CardHeader>
                <CardContent>
                  {forecast ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-primary">{formatDate(forecast.projectedCriticalDate)}</p>
                      <p className="text-sm text-muted-foreground">
                        Projected to cross the {forecast.criticalThresholdMm}mm critical threshold at a growth rate of{" "}
                        {forecast.growthRateMmPerMonth}mm/month.
                      </p>
                      <span className="eyebrow">{forecast.confidence} confidence</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough repeated measurements to forecast yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {brief && (
              <Card className="mt-6 border-primary/40">
                <CardHeader>
                  <CardTitle>AI-generated repair brief</CardTitle>
                  <CardDescription>Feature 3 — plain-language, non-technical summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{brief.summary}</p>
                  <p className="text-sm font-medium">
                    Recommended: {brief.recommendedAction} within {brief.recommendedTimeframeDays} days
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="detections">
            <DetectionTimeline detections={detections} onSelect={setSelected} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">{selected.crackType} crack — {selected.location}</DialogTitle>
                <DialogDescription>
                  {selected.widthMm}mm × {selected.lengthCm}cm · {Math.round(selected.confidence * 100)}% confidence ·
                  captured {formatDate(selected.capturedAt)} via {selected.capturedBy}
                </DialogDescription>
              </DialogHeader>
              {selected.previousImageUrl ? (
                <BeforeAfterSlider />
              ) : (
                <div className="aspect-video w-full rounded-md bg-muted" aria-hidden />
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={cn("inline-block rounded-pill border px-2.5 py-0.5 text-xs font-medium", SEVERITY_COLOR_CLASS[selected.severity])}>
                  {SEVERITY_LABEL[selected.severity]} severity
                </span>
                {selected.measurementSource && (
                  <span className="inline-block rounded-pill border border-border/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                    width via {selected.measurementSource === "segmentation" ? "segmentation mask" : "bbox heuristic"}
                  </span>
                )}
              </div>

              {selected.explanation && (
                <div className="mt-4">
                  <ExplanationPanel explanation={selected.explanation} />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
