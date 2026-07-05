"use client";

import { Clock3, ExternalLink, Newspaper, PlayCircle } from "lucide-react";
import Link from "next/link";

export type NewsScenarioSummary = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  moduleId: string;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
  newsPublishedAt: string | null;
  createdAt: string;
};

type NewsScenariosClientProps = {
  items: NewsScenarioSummary[];
};

const difficultyLabels: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsScenariosClient({
  items,
}: NewsScenariosClientProps) {
  if (items.length === 0) {
    return (
      <section className="practice-grid" aria-label="Escenarios de noticias">
        <article className="practice-card">
          <div className="practice-card__top">
            <span>
              <Newspaper aria-hidden="true" size={17} />
            </span>
            <span className="practice-status practice-status--pending">
              Sin escenarios todavía
            </span>
          </div>
          <div>
            <h2>Aún no hay escenarios de noticias</h2>
            <p className="practice-card__summary">
              El flujo diario los generará automáticamente a partir de las
              noticias de tránsito de El Salvador. Volvé más tarde.
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="practice-grid" aria-label="Escenarios de noticias">
      {items.map((item) => {
        const publishedLabel =
          formatDate(item.newsPublishedAt) ?? formatDate(item.createdAt);

        return (
          <article className="practice-card" key={item.id}>
            <div className="practice-card__top">
              <span>{item.moduleId.slice(0, 2)}</span>
              <span className="practice-status practice-status--ready">
                {difficultyLabels[item.difficulty] ?? item.difficulty}
              </span>
            </div>

            <div>
              <h2>{item.title}</h2>
              <p className="practice-card__summary">{item.description}</p>
            </div>

            <div className="practice-card__scenario">
              <strong>{item.newsTitle}</strong>
              <span>
                Fuente: {item.newsSource}
                {publishedLabel ? ` · ${publishedLabel}` : ""}
              </span>
            </div>

            <div className="practice-card__meta">
              <span>
                <Clock3 aria-hidden="true" size={15} />
                {item.estimatedMinutes} min
              </span>
              <span>
                <Newspaper aria-hidden="true" size={15} />
                Basado en noticia
              </span>
            </div>

            <div className="practice-card__actions">
              <a href={item.newsUrl} rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden="true" size={17} />
                Ver noticia
              </a>
              <Link href={`/news/${item.id}`}>
                <PlayCircle aria-hidden="true" size={17} />
                Practicar
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}
