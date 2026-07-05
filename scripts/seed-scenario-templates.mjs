import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { ScenarioDefinitionSchema } from "../core/scenario-definition";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const scenariosDir = path.join(rootDir, "core/scenarios/definitions/scenarios");

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const definitions = readdirSync(scenariosDir)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => {
    const raw = JSON.parse(readFileSync(path.join(scenariosDir, file), "utf8"));
    const parsed = ScenarioDefinitionSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`Invalid template ${file}:`, parsed.error.issues);
      process.exit(1);
    }
    return parsed.data;
  });

const rows = definitions.map((definition) => ({
  id: definition.id,
  pattern: definition.simulation.pattern,
  module_id: definition.moduleBinding.moduleId,
  lesson_ids: definition.learning.lessonIds,
  definition,
  updated_at: new Date().toISOString(),
}));

// ── Generation contract: everything the n8n workflow needs, derived from
// the real templates so it can never drift from the app schema. ──

const templatePatterns = [...new Set(rows.map((row) => row.pattern))];

// Engine-supported patterns beyond the templates (patternToSceneKind in
// core/scenario-definition.ts), with the template pattern used as fallback
// when a new_simulation item fails validation.
const extraPatterns = {
  safe_following_distance: "vehicle_safety_rain",
  speed_low_visibility: "vehicle_safety_rain",
  unsafe_overtake: "unsafe_lane_change",
};

const assetsById = new Map();
for (const definition of definitions) {
  for (const asset of definition.simulation.assets) {
    if (!assetsById.has(asset.id)) assetsById.set(asset.id, asset);
  }
}

const modules = {};
for (const row of rows) {
  if (!modules[row.module_id]) {
    modules[row.module_id] = {
      lessonIds: row.lesson_ids,
      templateId: row.id,
      templatePattern: row.pattern,
    };
  }
}

const contract = {
  version: 1,
  generatedAt: new Date().toISOString(),
  patterns: [
    ...templatePatterns.map((pattern) => ({
      pattern,
      hasTemplate: true,
      fallbackPattern: pattern,
    })),
    ...Object.entries(extraPatterns).map(([pattern, fallbackPattern]) => ({
      pattern,
      hasTemplate: false,
      fallbackPattern,
    })),
  ],
  modules,
  assets: [...assetsById.values()],
  enums: {
    environment: ["urban", "highway", "rural"],
    weather: ["clear", "rain", "fog"],
    timeOfDay: ["day", "dusk", "night"],
    roadType: [
      "single_carriageway",
      "multi_lane_avenue",
      "roundabout",
      "intersection",
    ],
    cameraMode: ["fixed", "third_person_follow", "top_down", "cinematic"],
    difficulty: ["basic", "intermediate", "advanced"],
    actorRole: [
      "ego_vehicle",
      "offender_vehicle",
      "oncoming_vehicle",
      "traffic_vehicle",
      "pedestrian",
      "police_officer",
    ],
    actorTag: [
      "crossing",
      "lane_change",
      "stopped",
      "fast",
      "oncoming",
      "offender",
      "vulnerable",
    ],
  },
  limits: {
    durationSeconds: [10, 60],
    actors: [2, 6],
    timelineEvents: [1, 12],
    options: [3, 4],
    estimatedMinutes: [2, 10],
    titleMaxChars: 70,
    optionLabelChars: [8, 120],
    fov: [30, 90],
    maxAbsCoordinate: 200,
  },
  scoring: {
    maxScore: 100,
    passScore: 70,
    metrics: [{ id: "decision", label: "Decisión segura", weight: 1 }],
  },
  legalDocumentDefault:
    "Ley de Transporte Terrestre, Tránsito y Seguridad Vial",
};

const contractPath = path.join(rootDir, "docs/n8n/generation-contract.json");
mkdirSync(path.dirname(contractPath), { recursive: true });
writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
console.log(`Contract written to ${path.relative(rootDir, contractPath)}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { error } = await supabase
  .from("scenario_templates")
  .upsert(rows, { onConflict: "id" });

if (error) {
  console.error("Upsert failed:", error);
  process.exit(1);
}

console.log(`Seeded ${rows.length} templates:`);
for (const row of rows) {
  console.log(`  ${row.id} [${row.pattern}] -> ${row.module_id}`);
}
