import type { KnowledgeModule } from "./knowledge";
import type { Scenario } from "./scenario-schema";
import { TRAFFIC_RULES } from "./traffic-rules";

export const scenariosForModule = (
  module: KnowledgeModule,
  allScenarios: Scenario[],
): Scenario[] =>
  allScenarios.filter((scenario) =>
    module.ruleKeys.includes(scenario.event.infractionType),
  );

export const modulesForScenario = (
  scenario: Scenario,
  modules: KnowledgeModule[],
): KnowledgeModule[] =>
  modules.filter((module) =>
    module.ruleKeys.includes(scenario.event.infractionType),
  );

export const rulesForModule = (module: KnowledgeModule) =>
  module.ruleKeys.map((key) => ({
    key,
    ...TRAFFIC_RULES[key],
  }));
