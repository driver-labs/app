import {
  getPrimaryScenarioForModule,
  getScenarioBinding,
  validateScenariosForModules,
} from "@/core/scenarios";
import {
  getLearningModuleIds,
  getLearningModules,
} from "@/lib/content/modules";
import PracticeDashboardClient, {
  type PracticeModuleSummary,
} from "./PracticeDashboardClient";

export const metadata = {
  title: "Prácticas | DriverLab",
};

export default function PracticarIndexPage() {
  const modules = getLearningModules();
  const validationIssues = validateScenariosForModules(getLearningModuleIds());
  const items: PracticeModuleSummary[] = modules.map((module) => {
    const scenario = getPrimaryScenarioForModule(module.id);
    const binding = scenario ? getScenarioBinding(scenario.id) : null;

    return {
      citationCount: module.didacticContent?.citations.length ?? 0,
      estimatedMinutes: module.estimatedMinutes,
      id: module.id,
      lessonCount: module.didacticContent?.lessons.length ?? 0,
      scenario: scenario
        ? {
            difficulty: scenario.metadata.difficulty,
            estimatedMinutes: scenario.metadata.estimatedMinutes,
            id: scenario.id,
            objective: scenario.learning.objectives[0],
            status: binding?.status ?? "draft",
            title: scenario.title,
          }
        : null,
      summary: module.summary,
      title: module.didacticContent?.headline ?? module.title,
    };
  });

  return (
    <PracticeDashboardClient
      modules={items}
      validationIssues={validationIssues}
    />
  );
}
