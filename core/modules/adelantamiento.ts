import type { KnowledgeModule } from "../knowledge";

export const adelantamiento: KnowledgeModule = {
  id: "adelantamiento",
  title: "Adelantamiento",
  summary:
    "Cuándo se puede rebasar y por qué la línea continua bloquea la maniobra aunque haya espacio aparente.",
  content: `## Adelantamiento

Adelantar exige visibilidad, espacio suficiente y una marca vial que permita invadir el carril contrario. La línea continua indica que no se debe cruzar para rebasar.

El riesgo principal aparece cuando el conductor se concentra en el vehículo lento y deja de leer la vía completa: curvas, pendientes, cruces o tráfico de frente reducen el margen de reacción.

La práctica debe entrenar la decisión de no adelantar cuando la marca vial lo prohíbe, incluso si la maniobra parece breve.`,
  ruleKeys: ["cross-solid-line", "wrong-way"],
  prerequisites: ["prioridad-de-paso"],
};
