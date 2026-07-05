import { createClient } from "@supabase/supabase-js";
import {
  ScenarioDefinitionSchema,
  toPlayableScenario,
  validateScenarioDefinition,
} from "../core/scenario-definition";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error(
    "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from("news_scenarios")
  .select("id, definition, generation_mode, news_source, created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.error("Fetch failed:", error);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log("No rows in news_scenarios.");
  process.exit(0);
}

let failures = 0;

for (const row of data) {
  const problems = [];

  const parsed = ScenarioDefinitionSchema.safeParse(row.definition);
  if (!parsed.success) {
    problems.push(
      ...parsed.error.issues.map(
        (issue) => `zod: ${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  } else {
    problems.push(
      ...validateScenarioDefinition(parsed.data).map(
        (issue) => `refs: ${issue.message}`,
      ),
    );
    try {
      toPlayableScenario(parsed.data);
    } catch (err) {
      problems.push(`engine: ${err instanceof Error ? err.message : err}`);
    }
  }

  const status = problems.length === 0 ? "PASS" : "FAIL";
  if (problems.length > 0) failures += 1;
  console.log(`${status}  ${row.id} [${row.generation_mode}]`);
  for (const problem of problems.slice(0, 5)) {
    console.log(`      ${problem}`);
  }
}

console.log(
  `\n${data.length - failures}/${data.length} scenarios pass all layers.`,
);
process.exit(failures > 0 ? 1 : 0);
