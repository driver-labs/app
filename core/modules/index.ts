import type { KnowledgeModule } from "../knowledge";
import { adelantamiento } from "./adelantamiento";
import { prioridadDePaso } from "./prioridad-de-paso";
import { senalesDeReglamentacion } from "./senales-de-reglamentacion";
import { velocidadYDistancias } from "./velocidad-y-distancias";

export const knowledgeModules: KnowledgeModule[] = [
  senalesDeReglamentacion,
  prioridadDePaso,
  adelantamiento,
  velocidadYDistancias,
];

export const getKnowledgeModule = (id: string): KnowledgeModule | undefined =>
  knowledgeModules.find((module) => module.id === id);

export const getKnowledgeModuleIds = (): string[] =>
  knowledgeModules.map((module) => module.id);

export function sortModulesTopologically(
  modules: KnowledgeModule[],
): KnowledgeModule[] {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: KnowledgeModule[] = [];

  const visit = (module: KnowledgeModule) => {
    if (visited.has(module.id)) return;
    if (visiting.has(module.id)) {
      throw new Error(`Ciclo detectado en roadmap: ${module.id}`);
    }

    visiting.add(module.id);
    for (const prerequisite of module.prerequisites) {
      const dependency = byId.get(prerequisite);
      if (dependency) visit(dependency);
    }
    visiting.delete(module.id);
    visited.add(module.id);
    sorted.push(module);
  };

  for (const module of modules) visit(module);
  return sorted;
}
