// Prints a startup banner listing every route across all three folders,
// before `concurrently` launches them. Run automatically via `npm run dev`.

const routes = [
  { label: "WEBSITE       ", url: "http://localhost:3000", note: "Next.js dashboard (map, alerts, structures, upload, admin)" },
  { label: "BACKEND GQL   ", url: "http://localhost:8000/graphql", note: "NestJS GraphQL playground (structures, detections, alerts)" },
  { label: "BACKEND REST  ", url: "http://localhost:8000/api/auth/login", note: "JWT login" },
  { label: "BACKEND REST  ", url: "http://localhost:8000/api/ingest/:structureId", note: "Upload image -> ML predict -> Detection/Alert" },
  { label: "ML-MODEL      ", url: "http://localhost:9000/docs", note: "FastAPI inference API docs (Swagger)" },
  { label: "ML-MODEL      ", url: "http://localhost:9000/predict", note: "POST an image, get crack predictions back" },
  { label: "ML-MODEL      ", url: "http://localhost:9000/health", note: "Model load status" },
];

const colors = { WEBSITE: "\x1b[34m", BACKEND: "\x1b[32m", "ML-MODEL": "\x1b[33m" };
const reset = "\x1b[0m";

console.log("\nVigilEye AI — starting all 3 folders\n");
for (const r of routes) {
  const key = r.label.trim().split(" ")[0];
  const color = colors[key] ?? "";
  console.log(`  ${color}${r.label}${reset} ${r.url}`);
  console.log(`  ${" ".repeat(r.label.length)} ${r.note}\n`);
}
console.log("Logs below are prefixed by folder (website / backend / ml-model) as each one starts.\n");
