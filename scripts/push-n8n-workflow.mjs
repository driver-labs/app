// Pushes docs/n8n/news-scenarios-workflow.json to the n8n cloud instance,
// links credentials (creating API-managed ones if needed), activates the
// workflow, triggers a manual run via the webhook and reports the execution.
//
// Usage: node --env-file=.env scripts/push-n8n-workflow.mjs [--no-run]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workflowPath = path.join(
  rootDir,
  "docs/n8n/news-scenarios-workflow.json",
);
const credentialCachePath = path.join(rootDir, "docs/n8n/.credentials.json");

const baseUrl = (process.env.N8N_INSTANCE_URL || "").replace(/\/$/, "");
const apiKey = process.env.N8N_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const noRun = process.argv.includes("--no-run");

if (!baseUrl || !apiKey) {
  console.error("Missing N8N_INSTANCE_URL or N8N_API_KEY in env.");
  process.exit(1);
}

async function api(method, endpoint, body) {
  const response = await fetch(`${baseUrl}/api/v1${endpoint}`, {
    method,
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function resolveCredentialIds() {
  // Newer n8n versions expose GET /credentials; older ones do not.
  const listed = await api("GET", "/credentials?limit=250");
  if (listed.status === 200 && Array.isArray(listed.json?.data)) {
    const byType = {};
    for (const credential of listed.json.data) {
      if (!byType[credential.type]) byType[credential.type] = credential;
      if (credential.name?.startsWith("DriverLab")) {
        byType[credential.type] = credential;
      }
    }
    const openAi = byType.openAiApi;
    const supabase = byType.supabaseApi;
    if (openAi && supabase) {
      console.log(
        `Using existing credentials: ${openAi.name} (${openAi.id}), ${supabase.name} (${supabase.id})`,
      );
      return {
        openAiApi: { id: openAi.id, name: openAi.name },
        supabaseApi: { id: supabase.id, name: supabase.name },
      };
    }
  }

  if (existsSync(credentialCachePath)) {
    const cached = JSON.parse(readFileSync(credentialCachePath, "utf8"));
    if (cached.openAiApi?.id && cached.supabaseApi?.id) {
      console.log("Using cached API-managed credential ids.");
      return cached;
    }
  }

  if (!openAiKey || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Cannot create credentials: missing OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  console.log("Creating API-managed credentials...");
  const openAi = await api("POST", "/credentials", {
    name: "DriverLab OpenAI (api)",
    type: "openAiApi",
    data: { apiKey: openAiKey },
  });
  if (openAi.status >= 300) {
    console.error("Failed to create OpenAI credential:", openAi.text);
    process.exit(1);
  }
  const supabase = await api("POST", "/credentials", {
    name: "DriverLab Supabase (api)",
    type: "supabaseApi",
    data: { host: supabaseUrl, serviceRole: serviceRoleKey },
  });
  if (supabase.status >= 300) {
    console.error("Failed to create Supabase credential:", supabase.text);
    process.exit(1);
  }
  const resolved = {
    openAiApi: { id: openAi.json.id, name: openAi.json.name },
    supabaseApi: { id: supabase.json.id, name: supabase.json.name },
  };
  writeFileSync(credentialCachePath, `${JSON.stringify(resolved, null, 2)}\n`);
  console.log(
    `Created: ${resolved.openAiApi.name} (${resolved.openAiApi.id}), ${resolved.supabaseApi.name} (${resolved.supabaseApi.id})`,
  );
  return resolved;
}

const workflow = JSON.parse(readFileSync(workflowPath, "utf8"));
const credentialIds = await resolveCredentialIds();

for (const node of workflow.nodes) {
  if (!node.credentials) continue;
  for (const type of Object.keys(node.credentials)) {
    if (credentialIds[type])
      node.credentials[type] = { ...credentialIds[type] };
  }
}

const body = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings,
};

const existing = await api("GET", `/workflows?limit=100`);
if (existing.status >= 300) {
  console.error("Failed to list workflows:", existing.text);
  process.exit(1);
}
const found = (existing.json?.data ?? []).find(
  (item) => item.name === workflow.name,
);

let workflowId = found?.id;
if (workflowId) {
  const updated = await api("PUT", `/workflows/${workflowId}`, body);
  if (updated.status >= 300) {
    console.error("Failed to update workflow:", updated.text);
    process.exit(1);
  }
  console.log(`Updated workflow ${workflowId}.`);
} else {
  const created = await api("POST", "/workflows", body);
  if (created.status >= 300) {
    console.error("Failed to create workflow:", created.text);
    process.exit(1);
  }
  workflowId = created.json.id;
  console.log(`Created workflow ${workflowId}.`);
}

const activated = await api("POST", `/workflows/${workflowId}/activate`);
if (activated.status >= 300) {
  console.error("Failed to activate workflow:", activated.text);
  process.exit(1);
}
console.log("Workflow activated (daily schedule + webhook live).");

if (noRun) {
  console.log("Skipping manual run (--no-run).");
  process.exit(0);
}

console.log("Triggering manual run via webhook...");
const webhookResponse = await fetch(`${baseUrl}/webhook/driverlab-news-run`, {
  method: "POST",
});
console.log(`Webhook responded ${webhookResponse.status}.`);

const startedAt = Date.now();
let execution = null;
while (Date.now() - startedAt < 10 * 60 * 1000) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const executions = await api(
    "GET",
    `/executions?workflowId=${workflowId}&limit=1`,
  );
  execution = executions.json?.data?.[0] ?? null;
  if (!execution) continue;
  if (execution.status === "running" || execution.status === "waiting") {
    process.stdout.write(".");
    continue;
  }
  break;
}
console.log("");

if (!execution) {
  console.error("No execution found after webhook trigger.");
  process.exit(1);
}

console.log(
  `Execution ${execution.id}: status=${execution.status} started=${execution.startedAt} stopped=${execution.stoppedAt ?? "-"}`,
);

if (execution.status !== "success") {
  const detail = await api(
    "GET",
    `/executions/${execution.id}?includeData=true`,
  );
  const runData = detail.json?.data?.resultData;
  if (runData?.error) {
    console.error("Workflow error:", runData.error.message);
    if (runData.error.node?.name) {
      console.error("Failing node:", runData.error.node.name);
    }
  }
  const nodeRuns = runData?.runData ?? {};
  for (const [nodeName, runs] of Object.entries(nodeRuns)) {
    const lastRun = runs?.[runs.length - 1];
    if (lastRun?.error) {
      console.error(
        `Node "${nodeName}" error: ${lastRun.error.message ?? lastRun.error.description ?? "unknown"}`,
      );
    }
  }
  process.exit(1);
}

console.log("Execution succeeded.");
