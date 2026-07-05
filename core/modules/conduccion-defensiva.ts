import type { KnowledgeModule } from "../knowledge";

export const conduccionDefensiva: KnowledgeModule = {
  id: "conduccion-defensiva",
  title: "Conducción defensiva",
  summary:
    "Anticipar el error propio y ajeno antes de que se vuelva un siniestro: visibilidad al adelantar y revisión del punto ciego.",
  content: `## Conducción defensiva

Manejar bien no es solo conocer la regla: es anticipar el riesgo antes de que se convierta en un choque. Eso significa observar más allá del vehículo de adelante, mantener distancia y reducir la velocidad en zonas donde un error ajeno puede aparecer de golpe.

Un bus o un camión detenido tapan lo que hay delante. Si no tenés campo visual despejado, no adelantás: puede haber un peatón cruzando justo delante del vehículo grande, oculto para vos hasta el último segundo.

El espejo retrovisor no muestra todo. Antes de cambiar de carril hay que girar la cabeza y revisar el punto ciego, porque una motocicleta puede estar ahí sin que el espejo la refleje. Un cambio de carril sin esa revisión puede tirar al motociclista.

En ambos casos la decisión segura es la misma: reducir velocidad, confirmar que el camino está despejado y recién entonces avanzar.`,
  ruleKeys: ["blind-overtake", "unsafe-lane-change"],
  prerequisites: ["velocidad-y-distancias", "adelantamiento"],
};
