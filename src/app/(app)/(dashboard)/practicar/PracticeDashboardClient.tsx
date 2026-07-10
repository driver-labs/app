"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  PlayCircle,
  RotateCcw,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyPracticeProgress,
  PRACTICE_PROGRESS_KEY,
  type PracticeProgressStore,
} from "@/core/practice-progress";
import { cn } from "@/lib/utils";
import ScenePreview, { type SceneKind } from "./ScenePreview";

export type PracticeScenarioSummary = {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  objective: string;
  sceneKind: SceneKind;
  status: "draft" | "active" | "archived";
};

const difficultyLabels: Record<string, string> = {
  advanced: "Difícil",
  basic: "Fácil",
  intermediate: "Media",
};

const actionClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:border-muted-foreground/40 hover:bg-muted-foreground/10";

const metricClassName =
  "grid gap-1 rounded-lg border border-border bg-background/35 p-2";

function statusBadgeClass(variant: "done" | "pending" | "ready") {
  return cn(
    "inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
    variant === "done" && "border-accent/40 bg-accent/15 text-accent",
    variant === "ready" && "border-secondary/40 bg-secondary/15 text-secondary",
    variant === "pending" && "border-warning/40 bg-warning/10 text-warning",
  );
}

export type PracticeModuleSummary = {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  lessonCount: number;
  citationCount: number;
  scenario: PracticeScenarioSummary | null;
};

type PracticeDashboardClientProps = {
  modules: PracticeModuleSummary[];
  validationIssues: Array<{ id: string; message: string }>;
};

function readProgress(): PracticeProgressStore {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(PRACTICE_PROGRESS_KEY) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object") return emptyPracticeProgress();

    const store = parsed as Partial<PracticeProgressStore>;
    return {
      attempts: Array.isArray(store.attempts) ? store.attempts : [],
      modules:
        store.modules && typeof store.modules === "object" ? store.modules : {},
    };
  } catch {
    return emptyPracticeProgress();
  }
}

function statusLabel(
  scenario: PracticeScenarioSummary | null,
  status?: string,
) {
  if (!scenario) return "Escenario pendiente de crear";
  if (scenario.status === "draft") return "Escenario en borrador";
  if (scenario.status === "archived") return "Escenario archivado";
  if (status === "mastered") return "Dominado";
  if (status === "completed") return "Completado";
  if (status === "in_progress") return "En progreso";
  return "Disponible para practicar";
}

export default function PracticeDashboardClient({
  modules,
  validationIssues,
}: PracticeDashboardClientProps) {
  const [progress, setProgress] = useState<PracticeProgressStore>(() =>
    emptyPracticeProgress(),
  );

  useEffect(() => {
    const sync = () => setProgress(readProgress());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("driver-labs-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("driver-labs-progress", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/practice/progress")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { progress?: PracticeProgressStore } | null) => {
        if (cancelled || !data?.progress) return;
        window.localStorage.setItem(
          PRACTICE_PROGRESS_KEY,
          JSON.stringify(data.progress),
        );
        setProgress(data.progress);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const completed = modules.filter((module) => {
      const state = progress.modules[module.id];
      return state?.status === "completed" || state?.status === "mastered";
    }).length;
    const attempts = Object.values(progress.modules).reduce(
      (sum, module) => sum + module.attemptsCount,
      0,
    );
    const learned = new Set(
      Object.values(progress.modules).flatMap(
        (module) => module.lessonsLearned,
      ),
    ).size;

    return { attempts, completed, learned };
  }, [modules, progress.modules]);

  return (
    <main className="w-full pb-14 pt-1">
      <header className="grid gap-4 border-b border-border pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-1.5 inline-flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <PlayCircle aria-hidden="true" size={14} />
            Prácticas 3D
          </p>
          <h1 className="m-0 text-2xl font-bold leading-tight text-foreground md:text-3xl">
            Centro de práctica
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Módulos activos, progreso y escenas listas para repasar sin perder
            contexto.
          </p>
        </div>
        <section
          className="grid grid-cols-3 gap-2 lg:min-w-[360px]"
          aria-label="Resumen"
        >
          <span className="grid min-h-14 content-center gap-0.5 rounded-lg border border-border bg-card/80 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-foreground">
              <CheckCircle2 aria-hidden="true" size={16} />
              {totals.completed}/{modules.length}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Completados
            </span>
          </span>
          <span className="grid min-h-14 content-center gap-0.5 rounded-lg border border-border bg-card/80 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-foreground">
              <RotateCcw aria-hidden="true" size={16} />
              {totals.attempts}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Intentos
            </span>
          </span>
          <span className="grid min-h-14 content-center gap-0.5 rounded-lg border border-border bg-card/80 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-foreground">
              <Trophy aria-hidden="true" size={16} />
              {totals.learned}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Aprendidas
            </span>
          </span>
        </section>
      </header>

      {validationIssues.length > 0 && (
        <section
          className="mt-4 grid gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3.5 text-warning"
          aria-label="Validaciones"
        >
          <p className="m-0 flex items-center gap-2 font-bold">
            <AlertTriangle aria-hidden="true" size={17} />
            Hay escenarios pendientes de corregir en el registry.
          </p>
          <ul className="m-0 pl-5">
            {validationIssues.map((issue) => (
              <li key={`${issue.id}-${issue.message}`}>
                <strong>{issue.id}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2"
        aria-label="Módulos disponibles"
      >
        {modules.map((module) => {
          const moduleProgress = progress.modules[module.id];
          const moduleAttempts = progress.attempts.filter(
            (attempt) => attempt.moduleId === module.id,
          );
          const mistakes = moduleAttempts.flatMap(
            (attempt) => attempt.mistakes,
          );
          const lastMistake = mistakes.at(-1);
          const practicedCount =
            moduleProgress?.lessonsPracticed.length ?? module.lessonCount;
          const learnedCount = moduleProgress?.lessonsLearned.length ?? 0;
          const label = statusLabel(module.scenario, moduleProgress?.status);
          const isComplete =
            moduleProgress?.status === "completed" ||
            moduleProgress?.status === "mastered";

          const statusVariant = isComplete
            ? "done"
            : module.scenario
              ? "ready"
              : "pending";
          const difficultyLabel = module.scenario
            ? (difficultyLabels[module.scenario.difficulty] ??
              module.scenario.difficulty)
            : null;

          return (
            <article
              className="grid min-h-full overflow-hidden rounded-lg border border-border bg-card/90 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-lg sm:grid-cols-[168px_minmax(0,1fr)]"
              key={module.id}
            >
              <div className="relative h-36 overflow-hidden border-b border-border bg-background/40 sm:h-auto sm:min-h-full sm:border-b-0 sm:border-r">
                {module.scenario ? (
                  <ScenePreview
                    sceneKind={module.scenario.sceneKind}
                    title={module.scenario.title}
                  />
                ) : (
                  <span
                    className="flex size-full items-center justify-center bg-[repeating-linear-gradient(45deg,hsl(var(--warning)/0.08),hsl(var(--warning)/0.08)_10px,hsl(var(--background)/0.4)_10px,hsl(var(--background)/0.4)_20px)] text-warning"
                    role="img"
                    aria-label="Escenario pendiente de crear"
                  >
                    <AlertTriangle aria-hidden="true" size={26} />
                  </span>
                )}
                <span className="absolute left-2.5 top-2.5 inline-flex size-8 items-center justify-center rounded-lg bg-background/70 text-sm font-bold text-secondary backdrop-blur-sm">
                  {module.id.slice(0, 2)}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={statusBadgeClass(statusVariant)}>
                    {label}
                  </span>
                  {difficultyLabel && (
                    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {difficultyLabel}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="m-0 text-base font-semibold leading-snug text-foreground">
                    {module.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {module.scenario
                      ? module.scenario.objective
                      : "El módulo permanece visible mientras se crea su escena."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/75">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 aria-hidden="true" size={15} />
                    {module.scenario?.estimatedMinutes ??
                      module.estimatedMinutes}{" "}
                    min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen aria-hidden="true" size={15} />
                    {practicedCount} lecciones
                  </span>
                </div>

                {moduleProgress ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/55"
                        role="progressbar"
                        aria-valuenow={moduleProgress.progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          style={{
                            width: `${moduleProgress.progressPercent}%`,
                          }}
                          className="block h-full rounded-full bg-gradient-to-r from-secondary to-accent transition-[width] duration-300"
                        />
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-foreground/75">
                        {moduleProgress.progressPercent}% · mejor{" "}
                        {moduleProgress.bestScore ?? "-"}
                      </span>
                    </div>

                    <details className="group/details border-t border-dashed border-border pt-2.5">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-secondary [&::-webkit-details-marker]:hidden">
                        Ver métricas
                        <span className="ml-1 inline group-open/details:hidden">
                          +
                        </span>
                        <span className="ml-1 hidden group-open/details:inline">
                          -
                        </span>
                      </summary>
                      <dl className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-3">
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Último
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {moduleProgress.lastScore ?? "-"}
                          </dd>
                        </div>
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Mejor
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {moduleProgress.bestScore ?? "-"}
                          </dd>
                        </div>
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Intentos
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {moduleProgress.attemptsCount}
                          </dd>
                        </div>
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Practicadas
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {practicedCount}
                          </dd>
                        </div>
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Aprendidas
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {learnedCount}
                          </dd>
                        </div>
                        <div className={metricClassName}>
                          <dt className="text-xs font-bold uppercase text-muted-foreground">
                            Errores
                          </dt>
                          <dd className="m-0 font-bold text-foreground">
                            {mistakes.length}
                          </dd>
                        </div>
                      </dl>
                      {lastMistake && (
                        <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm leading-5 text-destructive">
                          <AlertTriangle aria-hidden="true" size={15} />
                          <span>Último error: {lastMistake.message}</span>
                        </p>
                      )}
                    </details>
                  </>
                ) : (
                  <p className="m-0 text-sm italic text-foreground/70">
                    Todavía no practicaste este módulo. Sumá tu primer intento.
                  </p>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    className={actionClassName}
                    href={`/modulo/${module.id}`}
                  >
                    <BookOpen aria-hidden="true" size={17} />
                    Repasar
                  </Link>
                  {module.scenario ? (
                    <Link
                      className={cn(
                        actionClassName,
                        "border-accent/40 bg-accent/15",
                      )}
                      href={`/practica/${module.scenario.id}`}
                    >
                      {isComplete ? (
                        <RotateCcw aria-hidden="true" size={17} />
                      ) : (
                        <PlayCircle aria-hidden="true" size={17} />
                      )}
                      {isComplete ? "Reintentar" : "Practicar"}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground"
                    >
                      <AlertTriangle aria-hidden="true" size={17} />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
