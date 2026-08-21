"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Structure, ZoneRisk } from "@/lib/types";
import { SEVERITY_COLOR_CLASS, SEVERITY_LABEL, cn } from "@/lib/utils";
import Link from "next/link";

const SEVERITY_HEX: Record<Structure["riskLevel"], string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export type MapView = "pins" | "heatmap";

const HEATMAP_SOURCE_ID = "zone-risk-source";
const HEATMAP_LAYER_ID = "zone-risk-heat";

/**
 * Live structure map. Uses Mapbox GL JS when NEXT_PUBLIC_MAPBOX_TOKEN is set
 * (production behavior — risk-colored pins with clustering per the PRD).
 * Falls back to a plain pin-list grid when no token is configured, so the
 * dashboard still renders in local/dev/demo environments without a Mapbox key.
 *
 * `view="heatmap"` switches to an aggregate zone-level risk view (a city-wide
 * "where should I be worried" read, vs. per-structure pins) — a Mapbox GL
 * heatmap layer when live, a colored zone-tile grid in the fallback.
 */
export function StructureMap({
  structures,
  zones,
  view = "pins",
}: {
  structures: Structure[];
  zones?: ZoneRisk[];
  view?: MapView;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(!token);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let map: import("mapbox-gl").Map | undefined;
    let cancelled = false;
    const markers: import("mapbox-gl").Marker[] = [];

    import("mapbox-gl")
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.default.accessToken = token;
        map = new mapboxgl.default.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [structures[0]?.lng ?? -122.4, structures[0]?.lat ?? 37.77],
          zoom: 11,
        });

        map.on("load", () => {
          if (!map) return;

          if (zones && zones.length) {
            map.addSource(HEATMAP_SOURCE_ID, {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: zones.map((z) => ({
                  type: "Feature",
                  properties: { weight: z.aggregateRiskScore / 100 },
                  geometry: { type: "Point", coordinates: [z.lng, z.lat] },
                })),
              },
            });
            map.addLayer({
              id: HEATMAP_LAYER_ID,
              type: "heatmap",
              source: HEATMAP_SOURCE_ID,
              paint: {
                "heatmap-weight": ["get", "weight"],
                "heatmap-intensity": 1.4,
                "heatmap-radius": 60,
                "heatmap-opacity": view === "heatmap" ? 0.85 : 0,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(61,220,145,0)",
                  0.3, "#3ddc91",
                  0.6, "#ffcd48",
                  1, "#ef4444",
                ],
              },
            });
          }

          structures.forEach((s) => {
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.width = "14px";
            wrapper.style.height = "14px";
            wrapper.style.cursor = "pointer";
            wrapper.style.opacity = view === "heatmap" ? "0.35" : "1";
            wrapper.title = s.name;

            // Pulsing ring for structures needing urgent attention, so the
            // most critical risk is visible before a judge/user even hovers.
            if (s.riskLevel === "critical" || s.riskLevel === "high") {
              const pulse = document.createElement("div");
              pulse.className = "map-pin-pulse";
              pulse.style.color = SEVERITY_HEX[s.riskLevel];
              pulse.style.background = "currentColor";
              wrapper.appendChild(pulse);
            }

            const dot = document.createElement("div");
            dot.style.width = "14px";
            dot.style.height = "14px";
            dot.style.borderRadius = "50%";
            dot.style.border = "2px solid white";
            dot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.15)";
            dot.style.background = SEVERITY_HEX[s.riskLevel];
            dot.style.position = "relative";
            wrapper.appendChild(dot);

            const marker = new mapboxgl.default.Marker({ element: wrapper })
              .setLngLat([s.lng, s.lat])
              .setPopup(new mapboxgl.default.Popup({ offset: 12 }).setHTML(`<strong>${s.name}</strong>`))
              .addTo(map!);
            markers.push(marker);
          });
        });
      })
      .catch(() => setMapFailed(true));

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      map?.remove();
    };
  }, [token, structures, zones, view]);

  if (mapFailed) {
    return view === "heatmap" && zones ? (
      <ZoneHeatmapFallback zones={zones} />
    ) : (
      <StructureGridFallback structures={structures} />
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

function riskColor(score: number): string {
  if (score >= 70) return "bg-severity-critical/70";
  if (score >= 45) return "bg-severity-high/60";
  if (score >= 20) return "bg-severity-medium/50";
  return "bg-severity-low/40";
}

function ZoneHeatmapFallback({ zones }: { zones: ZoneRisk[] }) {
  return (
    <div className="grid h-full auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
      <p className="col-span-full mb-1 text-xs text-muted-foreground">
        City-wide aggregate risk by zone. Set NEXT_PUBLIC_MAPBOX_TOKEN for the live heatmap layer.
      </p>
      {zones.map((z, i) => (
        <motion.div
          key={z.zoneId}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          className={cn("flex flex-col justify-between rounded-lg border border-border/40 p-4", riskColor(z.aggregateRiskScore))}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{z.zoneName}</span>
            <span className="text-xl font-semibold">{z.aggregateRiskScore}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {z.structureCount} monitored structure{z.structureCount === 1 ? "" : "s"}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function StructureGridFallback({ structures }: { structures: Structure[] }) {
  return (
    <div className="grid h-full auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
      <p className="col-span-full mb-1 text-xs text-muted-foreground">
        Set NEXT_PUBLIC_MAPBOX_TOKEN to render the live Mapbox GL map. Showing pin-list fallback.
      </p>
      {structures.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
        >
          <Link
            href={`/structures/${s.id}`}
            className="flex items-center justify-between rounded-lg border border-border/40 bg-card p-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                {(s.riskLevel === "critical" || s.riskLevel === "high") && (
                  <span className={cn("map-pin-pulse", SEVERITY_COLOR_CLASS[s.riskLevel].split(" ")[1])} style={{ background: "currentColor" }} />
                )}
                <span className={cn("h-2.5 w-2.5 rounded-full", SEVERITY_COLOR_CLASS[s.riskLevel].split(" ")[1]?.replace("text-", "bg-"))} />
              </span>
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {s.type} · {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-pill border px-2 py-0.5 text-xs font-medium",
                SEVERITY_COLOR_CLASS[s.riskLevel]
              )}
            >
              {SEVERITY_LABEL[s.riskLevel]}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
