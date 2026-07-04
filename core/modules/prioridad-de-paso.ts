import type { KnowledgeModule } from "../knowledge";

export const prioridadDePaso: KnowledgeModule = {
  id: "prioridad-de-paso",
  title: "Prioridad de paso",
  summary:
    "Quién pasa primero en cruces con ALTO, ceda el paso y semáforo, sin asumir que el otro conductor frenará.",
  content: `## Prioridad de paso

La prioridad de paso se resuelve antes de entrar al punto de conflicto. En señales de ALTO o ceda el paso, el conductor debe detenerse o reducir lo suficiente para permitir la circulación segura de quienes tienen preferencia.

En cruces semaforizados, la luz roja obliga a detenerse antes de la línea. Avanzar por presión, cálculo de tiempo o confianza en que el otro vehículo va a frenar convierte una situación controlada en una colisión probable.

La decisión correcta combina cumplimiento de la señal y lectura del entorno: detener, ceder y avanzar sólo cuando el cruce está despejado.`,
  ruleKeys: ["run-stop", "no-yield", "run-red"],
  prerequisites: ["senales-de-reglamentacion"],
};
