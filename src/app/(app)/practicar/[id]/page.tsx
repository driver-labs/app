import { notFound } from "next/navigation";
import { modulesForScenario } from "@/core/links";
import { knowledgeModules } from "@/core/modules";
import { getScenario, getScenarioIds, scenarios } from "@/core/scenarios";
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

  const relatedModules = modulesForScenario(scenario, knowledgeModules);
  const otherScenarios = scenarios
    .filter((item) => item.id !== scenario.id)
    .map((item) => ({ id: item.id, title: item.title }));

  return (
    <ScenarioClient
      scenario={scenario}
      relatedModules={relatedModules.map((module) => ({
        id: module.id,
        title: module.title,
      }))}
      otherScenarios={otherScenarios}
    />
  );
}
