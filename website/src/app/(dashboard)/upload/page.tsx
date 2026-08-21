"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockStructures } from "@/lib/mock-data";
import { Upload as UploadIcon } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [structureId, setStructureId] = useState(mockStructures[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("uploading");

    // POST to backend's /api/ingest/:structureId (multipart/form-data),
    // which calls the ML service once and returns detections + any raised
    // alerts. See backend/src/ml/ml.controller.ts.
    const promise = new Promise((resolve) => setTimeout(resolve, 900));

    toast.promise(promise, {
      loading: "Uploading and running crack detection…",
      success: "Analysis complete — check the structure's detection history.",
      error: "Upload failed. Please try again.",
    });

    await promise;
    setStatus("done");
  }

  return (
    <>
      <Topbar title="Upload for Inspection" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Submit an image for crack detection</CardTitle>
              <CardDescription>
                Runs the same detection → severity → forecast pipeline used by mobile and edge capture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Structure</label>
                  <select
                    value={structureId}
                    onChange={(e) => setStructureId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {mockStructures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Image or video</label>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:bg-muted/60">
                    <UploadIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : "Click to choose a file"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <Button type="submit" disabled={!file || status === "uploading"} className="w-full">
                  {status === "uploading" ? "Uploading…" : status === "done" ? "Submitted ✓" : "Submit for analysis"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
