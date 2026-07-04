// ─────────────────────────────────────────────────────────────────────────
// BASE LEGAL CURADA — Normativa vial de El Salvador (LTTTSV = Ley de Transporte
// Terrestre, Tránsito y Seguridad Vial + su cuadro de multas).
//
// REGLA DE ORO: la IA REFERENCIA esta base; NUNCA inventa números de artículos.
// La creatividad de la IA es la narrativa del escenario; la LEY sale de acá.
//
//   confirmed: true  → artículo verificado (proviene del caso preview.html del usuario)
//   confirmed: false → texto correcto, pero el NÚMERO falta confirmar de la fuente
//                       oficial. Lo dejamos vacío a propósito: NO inventamos leyes.
// ─────────────────────────────────────────────────────────────────────────

export type LawRef = { code: string; summary: string };

export type RuleEntry = {
  title: string;
  explanation: string;
  refs: LawRef[];
  confirmed: boolean;
};

export const TRAFFIC_RULES = {
  speeding: {
    title: "Exceso de velocidad / no adecuar a las condiciones",
    explanation:
      "Debés respetar el límite del tramo y adecuar la velocidad al estado de la vía, el clima y la circulación (p. ej. reducir en pavimento mojado).",
    refs: [
      {
        code: "Art. 67 LTTTSV",
        summary: "Respetar límites y adecuar la conducción a las condiciones.",
      },
      {
        code: "Numeral 71 (cuadro de multas)",
        summary: "Circular a mayor velocidad que la reglamentaria.",
      },
    ],
    confirmed: true,
  },
  "run-red": {
    title: "No respetar la luz roja del semáforo",
    explanation:
      "La luz roja obliga a detenerse antes de la línea. Cruzar en rojo es infracción.",
    refs: [
      {
        code: "Numeral 106 (cuadro de multas)",
        summary: "No respetar la luz roja del semáforo.",
      },
    ],
    confirmed: true,
  },
  "phone-use": {
    title: "Uso de celular al conducir",
    explanation:
      "Está prohibido manipular o hacer uso del teléfono u otro dispositivo que distraiga o dificulte el manejo.",
    refs: [
      {
        code: "Numeral 113 (cuadro de multas)",
        summary: "Conducir manipulando teléfono/dispositivo.",
      },
    ],
    confirmed: true,
  },
  "no-seatbelt": {
    title: "No usar cinturón de seguridad",
    explanation:
      "El conductor y el acompañante delantero están obligados a usar cinturón.",
    refs: [
      {
        code: "Art. 86 LTTTSV",
        summary:
          "Obligación de usar cinturón (conductor y acompañante delantero).",
      },
      {
        code: "Numeral 58 (cuadro de multas)",
        summary: "El conductor no utiliza el cinturón.",
      },
    ],
    confirmed: true,
  },
  // ── Debajo: texto correcto, número por confirmar. NO inventamos el artículo. ──
  "run-stop": {
    title: "No respetar la señal de ALTO",
    explanation:
      "La señal de ALTO obliga a una detención COMPLETA antes de la línea y a ceder el paso antes de avanzar.",
    refs: [],
    confirmed: false,
  },
  "no-yield": {
    title: "No ceder el paso",
    explanation:
      "Debés ceder el paso a quien tiene prioridad antes de avanzar o girar.",
    refs: [],
    confirmed: false,
  },
  "cross-solid-line": {
    title: "Adelantar cruzando la línea continua",
    explanation:
      "La línea continua prohíbe cruzar al carril contrario y adelantar. Sólo se adelanta con línea discontinua y visibilidad suficiente.",
    refs: [],
    confirmed: false,
  },
  "wrong-way": {
    title: "Circular en contramano",
    explanation:
      "Circular en sentido contrario al establecido para el carril o la vía es infracción.",
    refs: [],
    confirmed: false,
  },
  "no-pedestrian-yield": {
    title: "No ceder el paso al peatón",
    explanation:
      "Debés ceder el paso al peatón que cruza por la senda peatonal.",
    refs: [],
    confirmed: false,
  },
  tailgating: {
    title: "No guardar distancia de seguimiento",
    explanation:
      "Debés mantener una distancia prudente con el vehículo de adelante para poder frenar a tiempo.",
    refs: [],
    confirmed: false,
  },
} as const satisfies Record<string, RuleEntry>;

export type InfractionType = keyof typeof TRAFFIC_RULES;
