import type { KnowledgeModule } from "../knowledge";

export const velocidadYDistancias: KnowledgeModule = {
  id: "velocidad-y-distancias",
  title: "Velocidad y distancias",
  summary:
    "Ajuste de velocidad, clima y distancia de seguimiento para conservar tiempo real de reacción.",
  content: `## Velocidad y distancias

El límite de velocidad no sustituye el criterio de conducción. Lluvia, poca visibilidad, tráfico denso o pavimento mojado obligan a reducir la velocidad aunque el tramo permita circular más rápido.

La distancia de seguimiento es el margen que permite detectar, decidir y frenar. Cuando se acorta demasiado, cualquier error del vehículo delantero se vuelve una emergencia.

En diagnóstico, separá hechos observables de suposiciones: sólo marcá exceso de velocidad, distracción u otra conducta cuando la evidencia del caso la sostenga.`,
  ruleKeys: ["speeding", "tailgating", "phone-use", "no-seatbelt"],
  prerequisites: ["prioridad-de-paso"],
};
