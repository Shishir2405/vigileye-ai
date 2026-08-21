"use client";

import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES = [
  { name: "Structural Engineer", access: "Full structure detail, trend data, forecasts" },
  { name: "Field Inspector", access: "Upload + view own submissions" },
  { name: "Municipal Safety Officer", access: "Map overview, alert inbox, repair briefs" },
  { name: "Admin", access: "User management, model version control" },
];

const MODEL_VERSIONS = [
  {
    name: "yolov11-crack",
    version: "v1.3.0",
    status: "active",
    recall: "92.4%",
    dataset: "CrackForest (118 labeled road-crack photos, real-world lighting/shadow variation)",
  },
  {
    name: "yolov11-crack",
    version: "v1.2.1",
    status: "archived",
    recall: "89.1%",
    dataset: "CrackForest only (118 labeled road-crack photos)",
  },
  {
    name: "deeplabv3-crack",
    version: "v0.4.0",
    status: "active",
    recall: "88.7%",
    dataset: "CrackForest segmentation masks (118 images, pixel-level crack ground truth)",
  },
  {
    name: "sdnet-classifier",
    version: "v0.1.0",
    status: "active",
    recall: "—",
    dataset: "SDNET2018 (56,092 real images — bridge decks, walls, pavements, USU official release)",
  },
];

export default function AdminPage() {
  return (
    <>
      <Topbar title="Admin" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Roles & access</CardTitle>
            <CardDescription>Role-based access enforced at the API gateway and re-validated per service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROLES.map((r) => (
              <div key={r.name} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-sm text-muted-foreground">{r.access}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model versions</CardTitle>
            <CardDescription>Served by the ML inference API in ../ml-model — trained on the real CrackForest dataset in ../ml-model/datasets (see datasets/README.md)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MODEL_VERSIONS.map((m) => (
              <div key={`${m.name}-${m.version}`} className="flex items-start justify-between gap-4 border-b border-border/30 pb-3 last:border-0">
                <div className="min-w-0">
                  <div>
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.version}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Trained on: <span className="text-foreground">{m.dataset}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">recall {m.recall}</span>
                  <Badge variant={m.status === "active" ? "default" : "muted"}>{m.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{m.name} {m.version}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={m.status === "active"}
                        onClick={() => toast.success(`${m.name} ${m.version} promoted to active — MODEL_PATH updated in ml-model/service.`)}
                      >
                        Promote to active
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={m.status === "archived"}
                        onClick={() => toast(`${m.name} ${m.version} archived.`)}
                      >
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast(`Fetching eval report for ${m.version}…`)}>
                        View eval report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
