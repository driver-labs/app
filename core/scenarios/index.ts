import {
  type ModuleScenarioBinding,
  ModuleScenarioBindingSchema,
  type ScenarioDefinition,
  ScenarioDefinitionSchema,
  toPlayableScenario,
  validateScenarioCatalog,
  validateScenarioDefinition,
} from "../scenario-definition";
import definitionsJson from "./definitions/scenarios.json";

export type { ModuleScenarioBinding, ScenarioDefinition };
export { toPlayableScenario };

const parsedDefinitions = ScenarioDefinitionSchema.array().parse(
  definitionsJson,
) satisfies ScenarioDefinition[];

export const scenarioDefinitions = parsedDefinitions;
export const scenarios = scenarioDefinitions;

export const scenarioRegistry = Object.fromEntries(
  scenarioDefinitions.map((scenario) => [scenario.id, scenario]),
) satisfies Record<string, ScenarioDefinition>;

export const moduleScenarioBindings = scenarioDefinitions.map(
  (scenario, index) =>
    ModuleScenarioBindingSchema.parse({
      isPrimary: scenario.moduleBinding.isPrimaryScenario,
      moduleId: scenario.moduleBinding.moduleId,
      order: index + 1,
      scenarioId: scenario.id,
      status: "active",
    }),
) satisfies ModuleScenarioBinding[];

for (const binding of moduleScenarioBindings) {
  const scenario = scenarioRegistry[binding.scenarioId];
  const issues = validateScenarioDefinition(scenario, binding);
  if (issues.length > 0) {
    throw new Error(
      `Invalid scenario ${binding.scenarioId}: ${issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
}

export function getScenarioById(scenarioId: string): ScenarioDefinition | null {
  return scenarioRegistry[scenarioId] ?? null;
}

export function getScenario(id: string): ScenarioDefinition | undefined {
  return scenarioRegistry[id];
}

export function getScenarioIds(): string[] {
  return scenarioDefinitions.map((scenario) => scenario.id);
}

export function getScenariosForModule(moduleId: string): ScenarioDefinition[] {
  return moduleScenarioBindings
    .filter(
      (binding) => binding.moduleId === moduleId && binding.status === "active",
    )
    .sort((left, right) => left.order - right.order)
    .map((binding) => getScenarioById(binding.scenarioId))
    .filter((scenario): scenario is ScenarioDefinition => Boolean(scenario));
}

export function getPrimaryScenarioForModule(
  moduleId: string,
): ScenarioDefinition | null {
  const binding = moduleScenarioBindings.find(
    (item) =>
      item.moduleId === moduleId && item.isPrimary && item.status === "active",
  );

  if (!binding) return null;

  return getScenarioById(binding.scenarioId);
}

export function getScenarioBinding(
  scenarioId: string,
): ModuleScenarioBinding | null {
  return (
    moduleScenarioBindings.find(
      (binding) => binding.scenarioId === scenarioId,
    ) ?? null
  );
}

export function validateScenariosForModules(moduleIds: string[]) {
  return validateScenarioCatalog({
    bindings: moduleScenarioBindings,
    moduleIds,
    scenarios: scenarioDefinitions,
  });
}
