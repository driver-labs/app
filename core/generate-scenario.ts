// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE  NOTICIA → ESCENARIO  (vía OpenRouter)
//
// ⚠️  La API key la PROVEE el caller (opts.apiKey); esta función no la lee de
//     ningún env. En Next se invoca desde app/api/generate/route.ts, así la key
//     queda server-side y nunca entra al bundle del cliente.
//
// 🔒  REGLA DE ORO DEL PROYECTO: la IA NUNCA inventa artículos legales. Antes de
//     validar, `rule` y `lawRefs` se SOBREESCRIBEN desde
//     TRAFFIC_RULES[infractionType]. La ley SIEMPRE sale de la base curada
//     (traffic-rules.ts), jamás de lo que devuelva el modelo.
// ═══════════════════════════════════════════════════════════════════════════

import {
  ActorKind,
  ActorRole,
  CenterLine,
  Maneuver,
  Outcome,
  RoadControl,
  type Scenario,
  ScenarioFormat,
  ScenarioSchema,
  SceneKind,
  SelectionType,
  Setting,
  SpeedLevel,
  StartLane,
  TimeOfDay,
  Weather,
} from "./scenario-schema";
import { type InfractionType, TRAFFIC_RULES } from "./traffic-rules";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

// Default: un modelo Claude en OpenRouter (formato `anthropic/…`).
// ⚠️  El slug EXACTO cambia con cada release. Elegilo / verificalo en
//     https://openrouter.ai/models y sobreescribí con la env var OPENROUTER_MODEL.
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

// La lista de infracciones sale de la base legal curada (única fuente de verdad).
const INFRACTION_TYPES = Object.keys(TRAFFIC_RULES) as InfractionType[];

// Menús (enums) permitidos, derivados del schema Zod para que NUNCA se
// desincronicen del contrato. `.options` es el array de literales del enum.
const ALLOWED_ENUMS = [
  `format: ${ScenarioFormat.options.join(" | ")}`,
  `sceneKind: ${SceneKind.options.join(" | ")}`,
  `environment.timeOfDay: ${TimeOfDay.options.join(" | ")}`,
  `environment.weather: ${Weather.options.join(" | ")}`,
  `environment.setting: ${Setting.options.join(" | ")}`,
  `road.centerLine: ${CenterLine.options.join(" | ")}`,
  `road.control: ${RoadControl.options.join(" | ")}`,
  `actors[].kind: ${ActorKind.options.join(" | ")}`,
  `actors[].role: ${ActorRole.options.join(" | ")}`,
  `actors[].maneuver: ${Maneuver.options.join(" | ")}`,
  `actors[].speed: ${SpeedLevel.options.join(" | ")}`,
  `actors[].startLane: ${StartLane.options.join(" | ")}`,
  `event.outcome: ${Outcome.options.join(" | ")}`,
  `selectionType: ${SelectionType.options.join(" | ")}`,
  `event.infractionType (elegí UNA): ${INFRACTION_TYPES.join(" | ")}`,
].join("\n- ");

// Esqueleto del JSON que esperamos del modelo. `rule` y `lawRefs` NO se piden:
// la app los rellena desde la base legal curada (regla de oro).
const JSON_SKELETON = `{
  "id": "slug-corto-descriptivo",
  "format": "decision" | "diagnosis",
  "sceneKind": "<un valor del menú>",
  "title": "título breve en español",
  "difficulty": "easy" | "medium" | "hard",
  "environment": { "timeOfDay": "...", "weather": "...", "setting": "..." },
  "road": { "centerLine": "...", "control": "...", "lanes": 1-4, "speedLimit": <km/h opcional>, "crosswalk": true|false },
  "actors": [
    { "id": "player", "kind": "...", "role": "...", "maneuver": "...", "speed": "...", "startLane": "...", "commitsInfraction": "<infractionType o omitir>" }
  ],
  "event": { "infractionType": "<la infracción PRINCIPAL>", "outcome": "..." },
  "selectionType": "single" | "multiple",
  "prompt": "pregunta para el jugador, en español",
  "choices": [
    { "id": "op1", "label": "opción", "correct": true|false, "consequence": "<outcome opcional, sólo en format decision>" }
  ],
  "feedback": { "success": "texto si acierta", "fail": "texto si falla" },
  "learningObjective": "objetivo pedagógico (opcional)"
}`;

const SYSTEM_PROMPT = `Sos un generador de ESCENARIOS para un simulador vial EDUCATIVO de El Salvador.
A partir del texto de una NOTICIA sobre un hecho de tránsito, producís UN (1) escenario jugable como objeto JSON estricto.

REGLAS DURAS (NO NEGOCIABLES):
1. Elegí SÓLO valores de los menús (enums) listados abajo. NUNCA inventes valores fuera del menú.
2. Identificá la infracción PRINCIPAL y ponela en "event.infractionType". Debe ser EXACTAMENTE una de la lista de infracciones.
3. Analizá SÓLO hechos OBSERVABLES en la noticia. NO asumas alcohol, drogas, exceso de velocidad ni fuga si la noticia no lo afirma con evidencia. Ante la duda, marcá esa conducta como distractor incorrecto (correct:false), no como hecho.
4. NO atribuyas responsabilidad penal ni culpabilidad jurídica. Describís CONDUCTAS de tránsito, no delitos ni condenas.
5. NO inventes números de artículos ni leyes. NO completes "rule" ni "lawRefs": la aplicación los rellena desde su base legal curada. Omití esos dos campos.
6. Respondé ÚNICAMENTE con el objeto JSON. Sin markdown, sin \`\`\`, sin texto antes o después.

MENÚS PERMITIDOS (usá EXACTAMENTE estos strings):
- ${ALLOWED_ENUMS}

ESTRUCTURA JSON ESPERADA:
${JSON_SKELETON}

Notas de diseño del quiz:
- "choices" debe tener AL MENOS 2 opciones. Marcá correct:true sólo en las conductas sostenidas por la evidencia observable.
- Incluí distractores plausibles (p. ej. alcohol o fuga) con correct:false cuando NO haya evidencia — enseñan a separar hecho de suposición.
- "feedback.success" y "feedback.fail" en español, con tono educativo.`;

function buildUserPrompt(newsText: string): string {
  return `NOTICIA:\n"""\n${newsText.trim()}\n"""\n\nGenerá el escenario JSON siguiendo TODAS las reglas.`;
}

/**
 * Extrae el objeto JSON de la respuesta del modelo. Tolera fences ```json ... ```
 * por si el modelo los agrega pese a la instrucción.
 */
function parseModelJson(content: string): unknown {
  let text = content.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `El modelo no devolvió JSON válido: ${(e as Error).message}\n--- contenido recibido (recortado) ---\n${text.slice(0, 500)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Aplica la REGLA DE ORO y valida.
 *
 * Toma el JSON crudo del modelo, SOBREESCRIBE `rule` y `lawRefs` con lo que dice
 * TRAFFIC_RULES[infractionType] (la base legal curada) y recién ahí valida con
 * ScenarioSchema. Así la ley SIEMPRE sale de la base, nunca del modelo.
 *
 * Exportada aparte para poder testear el pipeline (parseo + override + Zod)
 * sin necesidad de llamar a la API real (ver scripts/gen-scenario.mjs).
 */
export function finalizeScenario(modelJson: unknown): Scenario {
  const raw = isRecord(modelJson) ? modelJson : {};
  const event = isRecord(raw.event) ? raw.event : undefined;

  const infractionType: unknown = event?.infractionType;
  const ruleEntry =
    typeof infractionType === "string" && infractionType in TRAFFIC_RULES
      ? TRAFFIC_RULES[infractionType as InfractionType]
      : undefined;

  // ── Override de la base legal curada (regla de oro) ──
  // Si el infractionType es válido, `rule`/`lawRefs` SIEMPRE se pisan con la
  // base. Si el modelo inventó un infractionType fuera del enum, dejamos que
  // Zod tire el error claro de enum al validar.
  const withCuratedLaw = {
    ...raw,
    rule: ruleEntry ? ruleEntry.explanation : raw.rule,
    lawRefs: ruleEntry ? ruleEntry.refs : (raw.lawRefs ?? []),
  };

  return ScenarioSchema.parse(withCuratedLaw);
}

/**
 * Genera un Scenario validado a partir del texto de una noticia.
 * La API key y el modelo se pasan en `opts` (no se leen de env aquí), así la
 * misma función sirve desde route handlers o cualquier backend.
 */
export async function generateScenario(
  newsText: string,
  opts: { apiKey: string; model?: string; siteUrl?: string },
): Promise<Scenario> {
  const apiKey = opts.apiKey;
  if (!apiKey) {
    throw new Error("Falta la API key de OpenRouter (pasala en opts.apiKey).");
  }
  const model = opts.model || DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Atribución opcional recomendada por OpenRouter (aparece en tu dashboard).
      "HTTP-Referer": opts.siteUrl ?? "http://localhost",
      "X-Title": "Simulador Vial Educativo",
    },
    body: JSON.stringify({
      model,
      // Pedimos salida JSON. Reforzado también por el system prompt + fence-strip.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(newsText) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter respondió ${res.status} ${res.statusText}. Verificá OPENROUTER_MODEL (slug en openrouter.ai/models) y la key.\n${detail.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as OpenRouterResponse;
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error(
      "Respuesta de OpenRouter sin contenido en choices[0].message.content.",
    );
  }

  const modelJson = parseModelJson(content);
  // parseo → OVERRIDE de rule/lawRefs desde la base curada → validación Zod.
  return finalizeScenario(modelJson);
}
