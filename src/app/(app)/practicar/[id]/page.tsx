import { notFound } from "next/navigation";
import {
  getScenario,
  getScenarioIds,
  getScenariosForModule,
  scenarios,
} from "@/core/scenarios";
import { getLearningModule } from "@/lib/content/modules";
import ScenarioClient from "./ScenarioClient";

type PracticePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getScenarioIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PracticePageProps) {
  const { id } = await params;
  const scenario = getScenario(id);
  return {
    title: scenario ? `${scenario.title} | Practicar` : "Practicar",
  };
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) notFound();

  const relatedModule = getLearningModule(scenario.moduleBinding.moduleId);
  const moduleScenarios = getScenariosForModule(
    scenario.moduleBinding.moduleId,
  );
  const scenarioIndex = scenarios.findIndex((item) => item.id === scenario.id);
  const nextScenario =
    scenarioIndex >= 0 && scenarioIndex < scenarios.length - 1
      ? scenarios[scenarioIndex + 1]
      : null;
  const otherScenarios = scenarios
    .filter((item) => item.id !== scenario.id)
    .map((item) => ({ id: item.id, title: item.title }));

  return (
    <ScenarioClient
      scenario={scenario}
      relatedModules={
        relatedModule
          ? [
              {
                id: relatedModule.id,
                title: relatedModule.title,
              },
            ]
          : []
      }
      otherScenarios={otherScenarios}
      nextScenario={
        nextScenario ? { id: nextScenario.id, title: nextScenario.title } : null
      }
      moduleScenarioCount={moduleScenarios.length}
    />
  );
}
