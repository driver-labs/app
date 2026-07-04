import { type Scenario, ScenarioSchema } from "../scenario-schema";
import { TRAFFIC_RULES } from "../traffic-rules";

// Los escenarios del juego, ahora cumpliendo el CONTRATO completo (scenario-schema.ts).
// La regla y las referencias legales salen de traffic-rules.ts — no se escriben a mano acá.
export type { Scenario };
export { ScenarioSchema };

export const stopSignScenario: Scenario = ScenarioSchema.parse({
  id: "stop-01",
  format: "decision",
  sceneKind: "intersection-stop",
  title: "Intersección con señal de ALTO",
  environment: { timeOfDay: "night", weather: "rain", setting: "urban" },
  road: { control: "stop-sign", lanes: 2 },
  actors: [{ id: "player", role: "player", maneuver: "stop-yield" }],
  event: { infractionType: "run-stop", outcome: "crash" },
  selectionType: "single",
  prompt:
    "Te acercás a una intersección con señal de ALTO y hay tráfico cruzando. ¿Qué hacés?",
  choices: [
    {
      id: "stop",
      label: "Frenar por completo y ceder el paso",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "roll",
      label: "Bajar la velocidad y pasar sin frenar del todo",
      correct: false,
      consequence: "crash",
    },
    {
      id: "go",
      label: "Acelerar para cruzar antes que el otro auto",
      correct: false,
      consequence: "crash",
    },
  ],
  feedback: {
    success: "Frenaste, cediste el paso y cruzaste seguro.",
    fail: "Chocaste con el auto que cruzaba. La señal de ALTO no es opcional.",
  },
  rule: TRAFFIC_RULES["run-stop"].explanation,
  lawRefs: TRAFFIC_RULES["run-stop"].refs,
});

export const overtakeScenario: Scenario = ScenarioSchema.parse({
  id: "overtake-01",
  format: "diagnosis",
  sceneKind: "straight-overtake",
  title: "Adelantamiento indebido",
  environment: { timeOfDay: "day", weather: "clear", setting: "rural" },
  road: { control: "none", centerLine: "double-solid", lanes: 2 },
  actors: [
    { id: "slow", role: "traffic", maneuver: "straight", speed: "slow" },
    {
      id: "rogue",
      role: "offender",
      maneuver: "overtake",
      speed: "fast",
      commitsInfraction: "cross-solid-line",
    },
    {
      id: "oncoming",
      role: "oncoming",
      maneuver: "straight",
      startLane: "oncoming",
    },
  ],
  event: { infractionType: "cross-solid-line", outcome: "near-miss" },
  selectionType: "single",
  prompt:
    "El auto rojo acaba de sobrepasar al de adelante. ¿Qué infracción cometió?",
  choices: [
    {
      id: "continuous",
      label: "Adelantó cruzando la línea continua",
      correct: true,
    },
    { id: "speed", label: "Circulaba a exceso de velocidad", correct: false },
    { id: "signal", label: "No usó la luz de giro", correct: false },
    {
      id: "distance",
      label: "Iba demasiado pegado al auto de adelante",
      correct: false,
    },
  ],
  feedback: {
    success:
      "¡Exacto! Cruzó la línea continua para adelantar, y eso está prohibido.",
    fail: "Fijate de nuevo: el auto rojo cruzó la LÍNEA CONTINUA para pasar al de adelante.",
  },
  rule: TRAFFIC_RULES["cross-solid-line"].explanation,
  lawRefs: TRAFFIC_RULES["cross-solid-line"].refs,
});

export const scenarios: Scenario[] = [stopSignScenario, overtakeScenario];

export const getScenario = (id: string): Scenario | undefined =>
  scenarios.find((scenario) => scenario.id === id);

export const getScenarioIds = (): string[] =>
  scenarios.map((scenario) => scenario.id);
