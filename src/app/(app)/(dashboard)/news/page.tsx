import { Newspaper } from "lucide-react";
import { getNewsScenarios } from "@/lib/scenarios/news";
import NewsScenariosClient, {
  type NewsScenarioSummary,
} from "./NewsScenariosClient";

export const metadata = {
  title: "Noticias | DriverLab",
};

// Los escenarios llegan de Supabase vía el flujo diario de n8n; la página debe
// leerse en cada request (Next ya no marca dinámico por un fetch sin caché).
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const newsScenarios = await getNewsScenarios();

  const items: NewsScenarioSummary[] = newsScenarios.map((item) => ({
    id: item.definition.id,
    title: item.definition.title,
    description: item.definition.description,
    difficulty: item.definition.metadata.difficulty,
    estimatedMinutes: item.definition.metadata.estimatedMinutes,
    moduleId: item.definition.moduleBinding.moduleId,
    newsTitle: item.newsTitle,
    newsUrl: item.newsUrl,
    newsSource: item.newsSource,
    newsPublishedAt: item.newsPublishedAt,
    createdAt: item.createdAt,
  }));

  return (
    <section className="roadmap-panel" aria-label="Escenarios de noticias">
      <div className="roadmap-panel__heading">
        <div>
          <p className="eyebrow">
            <Newspaper aria-hidden="true" size={14} />
            Noticias de El Salvador
          </p>
          <h1>Escenarios generados desde noticias reales</h1>
          <p>
            Cada día un flujo automático lee noticias de tránsito de El Salvador
            y las convierte en escenarios de práctica 3D. Practicá la decisión
            correcta detrás de cada titular.
          </p>
        </div>
        <span>{items.length} escenarios</span>
      </div>
      <NewsScenariosClient items={items} />
    </section>
  );
}
