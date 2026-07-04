import type { KnowledgeModule } from "../knowledge";

export const senalesDeReglamentacion: KnowledgeModule = {
  id: "senales-de-reglamentacion",
  title: "Señales de reglamentación",
  summary:
    "Lectura operativa de ALTO, ceda el paso, semáforos y marcas que ordenan la circulación.",
  content: `## Señales de reglamentación

Las señales de reglamentación no son recomendaciones: indican obligaciones, prohibiciones o restricciones que el conductor debe cumplir antes de avanzar.

En una intersección, la señal de ALTO exige detener el vehículo por completo, observar el cruce y ceder el paso a quienes ya tienen prioridad. Un semáforo en rojo cumple la misma función de detención obligatoria.

La práctica debe enfocarse en una secuencia simple: detectar la señal, reducir la velocidad, detenerse cuando corresponde, verificar conflictos y continuar sólo cuando la maniobra sea segura.`,
  ruleKeys: ["run-stop", "run-red", "no-yield"],
  prerequisites: [],
};
