import { z } from "zod";
import {
  TRAFFIC_RULES,
  type InfractionType as TrafficInfractionType,
} from "./traffic-rules";

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE ESCENARIO — lo que la IA llena y el motor renderiza.
//
// Estado del motor por valor:  ✅ implementado · 🔨 pieza parcial · 🔮 futuro
//
// La IA elige SÓLO de estos enums (nunca inventa valores fuera del menú).
// ═══════════════════════════════════════════════════════════════════════════

// ── A. Identidad ──
export const ScenarioFormat = z.enum(["decision", "diagnosis"]); // ✅ los dos

export const SceneKind = z.enum([
  "intersection-stop", // ✅
  "intersection-light", // 🔨 (semáforo listo, falta la lógica de cruce)
  "straight-overtake", // ✅
  "crosswalk", // 🔮
  "roundabout", // ✅
  "curve", // 🔮
  "bus-stop", // ✅ bus detenido + peatón oculto
  "lane-change", // ✅ punto ciego al cambiar de carril
  "rain-braking", // ✅ distancia de frenado con lluvia
  "distraction", // ✅ celular al volante
]);

// ── B. Ambientación (→ RainyAmbience / Lights) ──
export const TimeOfDay = z.enum(["day", "dusk", "night"]); // ✅ day, night · 🔨 dusk
export const Weather = z.enum(["clear", "rain", "fog"]); // ✅ clear, rain · 🔮 fog
export const Setting = z.enum(["urban", "rural", "highway"]); // 🔨 urban

// ── C. La vía ──
export const CenterLine = z.enum(["dashed", "solid", "double-solid"]); // ✅
export const RoadControl = z.enum([
  "stop-sign",
  "traffic-light",
  "yield",
  "none",
]); // ✅ stop, light · 🔨 yield

// ── D. Actores ──
export const ActorKind = z.enum([
  "car",
  "motorcycle",
  "truck",
  "bus",
  "pedestrian",
]); // ✅ car · 🔮 resto
export const ActorRole = z.enum(["player", "traffic", "offender", "oncoming"]); // ✅
export const Maneuver = z.enum([
  "straight", // ✅
  "turn-left", // 🔨
  "turn-right", // 🔨
  "cross", // 🔮
  "overtake", // ✅
  "stop-yield", // ✅
  "change-lane", // ✅
]);
export const SpeedLevel = z.enum(["slow", "normal", "fast", "speeding"]); // 🔨
export const StartLane = z.enum(["right", "left", "oncoming", "sidewalk"]); // 🔨

// ── E. Evento ──
export const InfractionType = z.enum(
  Object.keys(TRAFFIC_RULES) as [
    TrafficInfractionType,
    ...TrafficInfractionType[],
  ], // el catálogo sale de la base legal
);
export const Outcome = z.enum([
  "crash",
  "near-miss",
  "safe-pass",
  "hard-brake",
]); // ✅ crash, safe-pass

// ── F. Quiz ──
export const SelectionType = z.enum(["single", "multiple"]); // 🔨 single · 🔮 multi (UI checkboxes)

// ── Sub-objetos ──
export const EnvironmentSchema = z.object({
  timeOfDay: TimeOfDay.default("day"),
  weather: Weather.default("clear"),
  setting: Setting.default("urban"),
});

export const RoadSchema = z.object({
  centerLine: CenterLine.default("dashed"),
  control: RoadControl.default("none"),
  lanes: z.number().int().min(1).max(4).default(2),
  speedLimit: z.number().int().positive().optional(), // km/h → cartel
  crosswalk: z.boolean().default(false),
});

export const ActorSchema = z.object({
  id: z.string(),
  kind: ActorKind.default("car"),
  model: z.string().optional(), // slug del catálogo; si falta, lo elige el motor
  role: ActorRole,
  maneuver: Maneuver.default("straight"),
  speed: SpeedLevel.default("normal"),
  startLane: StartLane.default("right"),
  commitsInfraction: InfractionType.optional(), // qué falta comete (si aplica)
});

export const ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  correct: z.boolean(),
  consequence: Outcome.optional(), // modo "decision": qué pasa si elegís esto
});

export const LawRefSchema = z.object({
  code: z.string(),
  summary: z.string(),
});

// ── Escenario completo ──
export const ScenarioSchema = z.object({
  // A. Identidad
  id: z.string(),
  format: ScenarioFormat,
  sceneKind: SceneKind,
  title: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  source: z
    .object({ type: z.enum(["news", "manual"]), ref: z.string() })
    .optional(),

  // B/C. Mundo
  environment: EnvironmentSchema.default(EnvironmentSchema.parse({})),
  road: RoadSchema.default(RoadSchema.parse({})),

  // D. Actores
  actors: z.array(ActorSchema).default([]),

  // E. Evento (lo que la escena reproduce)
  event: z.object({
    infractionType: InfractionType,
    outcome: Outcome,
  }),

  // F. Quiz
  selectionType: SelectionType.default("single"),
  prompt: z.string(),
  choices: z.array(ChoiceSchema).min(2),
  feedback: z.object({ success: z.string(), fail: z.string() }),

  // G. Base legal (la IA la REFERENCIA de traffic-rules.ts; no la inventa)
  rule: z.string(),
  lawRefs: z.array(LawRefSchema).default([]),

  // H. Pedagogía
  learningObjective: z.string().optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO VALIDADO — el caso salvadoreño de preview.html mapeado al contrato.
// Diagnóstico multi-select: lluvia + exceso + rojo + celular + cinturón → choque.
// Demuestra que el schema soporta un caso complejo real.
// ═══════════════════════════════════════════════════════════════════════════
export const exampleScenario: Scenario = ScenarioSchema.parse({
  id: "sv-lluvia-rojo-celular-01",
  format: "diagnosis",
  sceneKind: "intersection-light",
  title: "Lluvia, distracción y cruce semaforizado",
  difficulty: "medium",
  source: { type: "manual", ref: "preview.html (caso didáctico El Salvador)" },
  environment: { timeOfDay: "night", weather: "rain", setting: "urban" },
  road: { control: "traffic-light", lanes: 2, speedLimit: 50, crosswalk: true },
  actors: [
    {
      id: "player",
      role: "offender",
      maneuver: "straight",
      speed: "speeding",
      commitsInfraction: "run-red",
    },
  ],
  event: { infractionType: "run-red", outcome: "crash" },
  selectionType: "multiple",
  prompt:
    "¿Qué disposiciones de tránsito se infringieron con la evidencia disponible?",
  choices: [
    {
      id: "speed",
      label:
        "Circular a mayor velocidad y no adecuar a lluvia/pavimento mojado",
      correct: true,
    },
    { id: "red", label: "No respetar la luz roja del semáforo", correct: true },
    {
      id: "phone",
      label: "Conducir manipulando el teléfono celular",
      correct: true,
    },
    {
      id: "belt",
      label: "No utilizar el cinturón (indicador del tablero)",
      correct: true,
    },
    {
      id: "alcohol",
      label: "Conducir bajo efectos de bebidas embriagantes",
      correct: false,
    },
    {
      id: "flee",
      label: "Retirarse del lugar para evadir responsabilidad",
      correct: false,
    },
  ],
  feedback: {
    success:
      "Correcto: exceso/velocidad no adecuada, luz roja, uso de celular y cinturón sin abrochar.",
    fail: "Revisá la evidencia: no hay prueba de alcohol ni de fuga; sí de velocidad, rojo, celular y cinturón.",
  },
  rule: "Se deben identificar sólo las conductas sostenidas por hechos observables. No asumir alcohol ni fuga.",
  lawRefs: [
    ...TRAFFIC_RULES.speeding.refs,
    ...TRAFFIC_RULES["run-red"].refs,
    ...TRAFFIC_RULES["phone-use"].refs,
    ...TRAFFIC_RULES["no-seatbelt"].refs,
  ],
  learningObjective:
    "Separar evidencia observable de suposiciones al identificar infracciones.",
});
