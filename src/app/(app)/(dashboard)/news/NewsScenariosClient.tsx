"use client";

import { ExternalLink, Newspaper, PlayCircle } from "lucide-react";
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

const gridClassName =
  "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";

const cardClassName =
  "grid min-h-[220px] content-start gap-3 rounded-lg border border-border bg-card/80 p-3.5 text-card-foreground transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-secondary/35 hover:shadow-lg";

const actionClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:border-muted-foreground/40 hover:bg-muted-foreground/10";

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
      <section className={gridClassName} aria-label="Escenarios de noticias">
        <article className={cardClassName}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted-foreground/15 text-muted-foreground">
              <Newspaper aria-hidden="true" size={17} />
            </span>
            <span className="inline-flex min-h-6 items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              Sin escenarios todavía
            </span>
          </div>
          <div>
            <h2 className="m-0 text-base font-semibold leading-snug text-foreground">
              Aún no hay escenarios de noticias
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              Pronto vas a encontrar casos recientes convertidos en prácticas
              cortas.
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className={gridClassName} aria-label="Escenarios de noticias">
      {items.map((item) => {
        const publishedLabel =
          formatDate(item.newsPublishedAt) ?? formatDate(item.createdAt);

        return (
          <article className={cardClassName} key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted-foreground/15 font-bold text-muted-foreground">
                {item.moduleId.slice(0, 2)}
              </span>
              <span className="inline-flex min-h-6 items-center rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                {difficultyLabels[item.difficulty] ?? item.difficulty}
              </span>
            </div>

            <div className="grid gap-2">
              <h2 className="m-0 text-base font-semibold leading-snug text-foreground">
                {item.title}
              </h2>
              <span className="text-sm leading-6 text-muted-foreground">
                {item.newsSource}
                {publishedLabel ? ` · ${publishedLabel}` : ""}
              </span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2">
              <a
                className={actionClassName}
                href={item.newsUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" size={17} />
                Ver noticia
              </a>
              <Link
                className={`${actionClassName} border-accent/40 bg-accent/15`}
                href={`/noticias/${item.id}`}
              >
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
