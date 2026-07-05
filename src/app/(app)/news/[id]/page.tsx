import { notFound } from "next/navigation";
import { scenarios } from "@/core/scenarios";
import { getLearningModule } from "@/lib/content/modules";
import { getNewsScenario } from "@/lib/scenarios/news";
import NewsScenarioClient from "./NewsScenarioClient";

type NewsPracticePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: NewsPracticePageProps) {
  const { id } = await params;
  const newsScenario = await getNewsScenario(id);
  return {
    title: newsScenario
      ? `${newsScenario.definition.title} | Noticias`
      : "Noticias",
  };
}

export default async function NewsPracticePage({
  params,
}: NewsPracticePageProps) {
  const { id } = await params;
  const newsScenario = await getNewsScenario(id);
  if (!newsScenario) notFound();

  const scenario = newsScenario.definition;
  const relatedModule = getLearningModule(scenario.moduleBinding.moduleId);
  const otherScenarios = scenarios.map((item) => ({
    id: item.id,
    title: item.title,
  }));

  return (
    <NewsScenarioClient
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
    />
  );
}
