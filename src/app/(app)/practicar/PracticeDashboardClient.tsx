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

export type PracticeScenarioSummary = {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  objective: string;
  status: "draft" | "active" | "archived";
};

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
    <main className="practice-dashboard">
      <header className="practice-dashboard__header">
        <div>
          <p className="eyebrow">
            <PlayCircle aria-hidden="true" size={14} />
            Practicas 3D
          </p>
          <h1>Practica cada modulo con una escena interactiva</h1>
          <p>
            Cada tarjeta usa el catalogo educativo actual y su escenario
            asociado por registry. El avance se calcula por modulo y escenario.
          </p>
        </div>
        <section className="practice-dashboard__stats" aria-label="Resumen">
          <span>
            <CheckCircle2 aria-hidden="true" size={17} />
            {totals.completed}/{modules.length} completados
          </span>
          <span>
            <RotateCcw aria-hidden="true" size={17} />
            {totals.attempts} intentos
          </span>
          <span>
            <Trophy aria-hidden="true" size={17} />
            {totals.learned} lecciones aprendidas
          </span>
        </section>
      </header>

      {validationIssues.length > 0 && (
        <section className="practice-validation" aria-label="Validaciones">
          <p>
            <AlertTriangle aria-hidden="true" size={17} />
            Hay escenarios pendientes de corregir en el registry.
          </p>
          <ul>
            {validationIssues.map((issue) => (
              <li key={`${issue.id}-${issue.message}`}>
                <strong>{issue.id}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="practice-grid" aria-label="Modulos disponibles">
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

          return (
            <article className="practice-card" key={module.id}>
              <div className="practice-card__top">
                <span>{module.id.slice(0, 2)}</span>
                <span
                  className={
                    isComplete
                      ? "practice-status practice-status--done"
                      : module.scenario
                        ? "practice-status practice-status--ready"
                        : "practice-status practice-status--pending"
                  }
                >
                  {label}
                </span>
              </div>

              <div>
                <h2>{module.title}</h2>
                <p className="practice-card__summary">{module.summary}</p>
              </div>

              {module.scenario ? (
                <div className="practice-card__scenario">
                  <strong>{module.scenario.title}</strong>
                  <span>{module.scenario.objective}</span>
                </div>
              ) : (
                <div className="practice-card__scenario practice-card__scenario--pending">
                  <strong>Escenario pendiente de crear</strong>
                  <span>El modulo permanece visible y controlado.</span>
                </div>
              )}

              {moduleProgress ? (
                <dl className="practice-card__metrics">
                  <div>
                    <dt>Ultimo</dt>
                    <dd>{moduleProgress.lastScore ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Mejor</dt>
                    <dd>{moduleProgress.bestScore ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Intentos</dt>
                    <dd>{moduleProgress.attemptsCount}</dd>
                  </div>
                  <div>
                    <dt>Practicadas</dt>
                    <dd>{practicedCount}</dd>
                  </div>
                  <div>
                    <dt>Aprendidas</dt>
                    <dd>{learnedCount}</dd>
                  </div>
                  <div>
                    <dt>Errores</dt>
                    <dd>{mistakes.length}</dd>
                  </div>
                  <div>
                    <dt>Avance</dt>
                    <dd>{moduleProgress.progressPercent}%</dd>
                  </div>
                </dl>
              ) : (
                <p className="practice-card__empty">
                  Todavia no practicaste este modulo — sumá tu primer intento.
                </p>
              )}

              {lastMistake && (
                <p className="practice-card__mistake">
                  <AlertTriangle aria-hidden="true" size={15} />
                  <span>Ultimo error: {lastMistake.message}</span>
                </p>
              )}

              <div className="practice-card__meta">
                <span>
                  <Clock3 aria-hidden="true" size={15} />
                  {module.scenario?.estimatedMinutes ?? module.estimatedMinutes}{" "}
                  min
                </span>
                <span>
                  <BookOpen aria-hidden="true" size={15} />
                  {practicedCount} lecciones practicadas
                </span>
              </div>

              <div className="practice-card__actions">
                <Link href={`/modulo/${module.id}`}>
                  <BookOpen aria-hidden="true" size={17} />
                  Repasar
                </Link>
                {module.scenario ? (
                  <Link href={`/practicar/${module.scenario.id}`}>
                    {isComplete ? (
                      <RotateCcw aria-hidden="true" size={17} />
                    ) : (
                      <PlayCircle aria-hidden="true" size={17} />
                    )}
                    {isComplete ? "Reintentar" : "Practicar"}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="disabled-link">
                    <AlertTriangle aria-hidden="true" size={17} />
                    Pendiente
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
