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

export const roundaboutScenario: Scenario = ScenarioSchema.parse({
  id: "roundabout-01",
  format: "decision",
  sceneKind: "roundabout",
  title: "Entrando al redondel",
  environment: { timeOfDay: "day", weather: "clear", setting: "urban" },
  road: { control: "yield", lanes: 2 },
  actors: [
    { id: "player", kind: "car", role: "player", maneuver: "straight" },
    { id: "moto1", kind: "motorcycle", role: "traffic", maneuver: "straight" },
    { id: "bus1", kind: "bus", role: "traffic", maneuver: "straight" },
  ],
  event: { infractionType: "no-yield", outcome: "crash" },
  selectionType: "single",
  prompt:
    "Una moto ya circula dentro del redondel y se acerca a tu punto de entrada. ¿Qué hacés?",
  choices: [
    {
      id: "accelerate",
      label: "Acelero para entrar antes de que pase la moto",
      correct: false,
      consequence: "crash",
    },
    {
      id: "yield",
      label:
        "Reduzco la velocidad y cedo el paso a quien ya circula en el redondel",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "stop",
      label: "Me detengo por completo aunque el paso esté despejado",
      correct: false,
      consequence: "crash",
    },
  ],
  feedback: {
    success:
      "Cediste el paso a quien ya circulaba dentro del redondel y saliste sin riesgo.",
    fail: "Quien circula dentro del redondel tiene prioridad. Entrar sin ceder el paso puede causar un choque lateral, sobre todo con motos.",
  },
  rule: TRAFFIC_RULES["no-yield"].explanation,
  lawRefs: TRAFFIC_RULES["no-yield"].refs,
  learningObjective:
    "Reconocer que quien ya circula dentro de un redondel tiene prioridad de paso.",
});

export const busStopScenario: Scenario = ScenarioSchema.parse({
  id: "bus-stop-01",
  format: "decision",
  sceneKind: "bus-stop",
  title: "Bus detenido y peatón oculto",
  environment: { timeOfDay: "dusk", weather: "clear", setting: "urban" },
  road: { control: "none", lanes: 2 },
  actors: [
    { id: "player", kind: "car", role: "player", maneuver: "straight" },
    { id: "bus1", kind: "bus", role: "traffic", maneuver: "stop-yield" },
    { id: "ped1", kind: "pedestrian", role: "traffic", maneuver: "cross" },
  ],
  event: { infractionType: "blind-overtake", outcome: "near-miss" },
  selectionType: "single",
  prompt:
    "Un bus está detenido adelante y no ves qué hay más allá. ¿Qué hacés?",
  choices: [
    {
      id: "blind-pass",
      label: "Adelanto al bus aunque no tengo visibilidad clara",
      correct: false,
      consequence: "near-miss",
    },
    {
      id: "wait",
      label:
        "Reduzco la velocidad, espero a tener campo visual despejado y paso cuando sea seguro",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "horn",
      label: "Toco el claxon y paso de todas formas",
      correct: false,
      consequence: "near-miss",
    },
  ],
  feedback: {
    success:
      "Esperaste a tener visibilidad antes de pasar: si había un peatón cruzando, tuviste tiempo de reaccionar.",
    fail: "Casi atropellás a un peatón oculto por el bus. Adelantar sin visibilidad es la causa más común de este tipo de atropello.",
  },
  rule: TRAFFIC_RULES["blind-overtake"].explanation,
  lawRefs: TRAFFIC_RULES["blind-overtake"].refs,
  learningObjective:
    "No adelantar vehículos grandes detenidos sin campo visual despejado.",
});

export const laneChangeScenario: Scenario = ScenarioSchema.parse({
  id: "lane-change-01",
  format: "decision",
  sceneKind: "lane-change",
  title: "Moto en el punto ciego",
  environment: { timeOfDay: "day", weather: "clear", setting: "highway" },
  road: { control: "none", lanes: 2 },
  actors: [
    {
      id: "player",
      kind: "car",
      role: "player",
      maneuver: "change-lane",
    },
    { id: "moto1", kind: "motorcycle", role: "traffic", maneuver: "straight" },
  ],
  event: { infractionType: "unsafe-lane-change", outcome: "crash" },
  selectionType: "single",
  prompt: "Querés cambiar al carril izquierdo. ¿Qué hacés antes de moverte?",
  choices: [
    {
      id: "mirror-only",
      label: "Miro rápido el espejo retrovisor y me cambio",
      correct: false,
      consequence: "crash",
    },
    {
      id: "check-blind-spot",
      label:
        "Reviso el espejo, giro la cabeza para chequear el punto ciego y señalizo antes de cambiar",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "no-check",
      label: "Me cambio directo, total tengo el carril libre en el espejo",
      correct: false,
      consequence: "crash",
    },
  ],
  feedback: {
    success:
      "Revisaste el punto ciego, viste la moto y esperaste a que pasara antes de cambiar de carril.",
    fail: "Había una moto en tu punto ciego que el espejo no mostraba. Cambiaste de carril sin verla y la golpeaste.",
  },
  rule: TRAFFIC_RULES["unsafe-lane-change"].explanation,
  lawRefs: TRAFFIC_RULES["unsafe-lane-change"].refs,
  learningObjective:
    "El espejo no cubre el punto ciego: hay que girar la cabeza antes de cambiar de carril.",
});

export const rainBrakingScenario: Scenario = ScenarioSchema.parse({
  id: "rain-braking-01",
  format: "decision",
  sceneKind: "rain-braking",
  title: "Lluvia y distancia de frenado",
  environment: { timeOfDay: "night", weather: "rain", setting: "urban" },
  road: { control: "none", lanes: 2, crosswalk: true },
  actors: [
    { id: "lead", kind: "car", role: "traffic", maneuver: "stop-yield" },
    { id: "player", kind: "car", role: "player", maneuver: "straight" },
    { id: "ped1", kind: "pedestrian", role: "traffic", maneuver: "cross" },
  ],
  event: { infractionType: "tailgating", outcome: "near-miss" },
  selectionType: "single",
  prompt:
    "Manejás de noche y con lluvia, siguiendo de cerca al auto de adelante. ¿Qué hacés?",
  choices: [
    {
      id: "same-distance",
      label:
        "Mantengo la misma distancia y velocidad; ya frenaré si hace falta",
      correct: false,
      consequence: "near-miss",
    },
    {
      id: "more-distance",
      label:
        "Reduzco la velocidad y aumento la distancia porque la lluvia alarga el frenado",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "overtake",
      label: "Acelero un poco para adelantarlo antes de la zona de riesgo",
      correct: false,
      consequence: "near-miss",
    },
  ],
  feedback: {
    success:
      "Con más distancia y menos velocidad, frenaste con margen cuando el auto de adelante paró por el peatón.",
    fail: "El auto de adelante frenó por un peatón y casi lo chocás: con lluvia, la distancia de frenado es mayor.",
  },
  rule: TRAFFIC_RULES.tailgating.explanation,
  lawRefs: TRAFFIC_RULES.tailgating.refs,
  learningObjective:
    "Con lluvia o poca visibilidad hay que aumentar la distancia de seguimiento y bajar la velocidad.",
});

export const distractionScenario: Scenario = ScenarioSchema.parse({
  id: "distraction-01",
  format: "decision",
  sceneKind: "distraction",
  title: "Celular al volante",
  environment: { timeOfDay: "day", weather: "clear", setting: "urban" },
  road: { control: "none", lanes: 2 },
  actors: [
    { id: "player", kind: "car", role: "player", maneuver: "straight" },
    { id: "moto1", kind: "motorcycle", role: "traffic", maneuver: "cross" },
  ],
  event: { infractionType: "phone-use", outcome: "near-miss" },
  selectionType: "single",
  prompt:
    "Te llega un mensaje mientras manejás por una zona con tráfico. ¿Qué hacés?",
  choices: [
    {
      id: "glance",
      label: "Miro el celular un par de segundos y sigo manejando",
      correct: false,
      consequence: "near-miss",
    },
    {
      id: "put-away",
      label:
        "Guardo el celular y espero a poder detenerme en un lugar permitido para responder",
      correct: true,
      consequence: "safe-pass",
    },
    {
      id: "quick-read",
      label: "Lo leo rápido sin dejar de mirar la calle",
      correct: false,
      consequence: "near-miss",
    },
  ],
  feedback: {
    success:
      "Guardaste el celular y mantuviste la vista en la calle: viste a tiempo a la moto que se metía al carril.",
    fail: "Dos segundos sin mirar la calle fueron suficientes para no ver a la moto que se metía al carril.",
  },
  rule: TRAFFIC_RULES["phone-use"].explanation,
  lawRefs: TRAFFIC_RULES["phone-use"].refs,
  learningObjective:
    "Ninguna respuesta al celular vale más que la vista en la calle.",
});

export const scenarios: Scenario[] = [
  stopSignScenario,
  overtakeScenario,
  roundaboutScenario,
  busStopScenario,
  laneChangeScenario,
  rainBrakingScenario,
  distractionScenario,
];

export const getScenario = (id: string): Scenario | undefined =>
  scenarios.find((scenario) => scenario.id === id);

export const getScenarioIds = (): string[] =>
  scenarios.map((scenario) => scenario.id);
