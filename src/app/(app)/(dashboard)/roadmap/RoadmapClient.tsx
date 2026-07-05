"use client";

import { BookOpen, Lock, PlayCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LEGACY_COMPLETED_SCENARIOS_KEY,
  PRACTICE_PROGRESS_KEY,
  type PracticeProgressStore,
} from "@/core/practice-progress";

export type RoadmapNode = {
  id: string;
  title: string;
  summary: string;
  citationCount?: number;
  estimatedMinutes?: number;
  lessonCount?: number;
  prerequisites: string[];
  scenarios: Array<{ id: string; title: string }>;
};

type RoadmapClientProps = {
  nodes: RoadmapNode[];
};

const gridClassName =
  "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";

const cardClassName =
  "grid min-h-[250px] content-start gap-3 rounded-lg border border-border bg-card/80 p-3.5 text-card-foreground transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-secondary/35 hover:shadow-lg";

const actionClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:border-muted-foreground/40 hover:bg-muted-foreground/10";

const disabledActionClassName =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground";

function statusBadgeClass(variant: "done" | "pending" | "ready") {
  if (variant === "done") {
    return "inline-flex min-h-7 items-center rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent";
  }
  if (variant === "ready") {
    return "inline-flex min-h-7 items-center rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary";
  }
  return "inline-flex min-h-7 items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning";
}

function readCompletedScenarioIds(): Set<string> {
  try {
    const progress: unknown = JSON.parse(
      window.localStorage.getItem(PRACTICE_PROGRESS_KEY) ?? "{}",
    );
    const completed = new Set<string>();

    if (progress && typeof progress === "object") {
      const store = progress as Partial<PracticeProgressStore>;
      for (const attempt of store.attempts ?? []) {
        if (attempt.passed) completed.add(attempt.scenarioId);
      }
    }

    const legacy: unknown = JSON.parse(
      window.localStorage.getItem(LEGACY_COMPLETED_SCENARIOS_KEY) ?? "[]",
    );
    if (Array.isArray(legacy)) {
      for (const item of legacy) {
        if (typeof item === "string") completed.add(item);
      }
    }

    return completed;
  } catch {
    return new Set();
  }
}

export default function RoadmapClient({ nodes }: RoadmapClientProps) {
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const sync = () => setCompletedScenarios(readCompletedScenarioIds());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("driver-labs-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("driver-labs-progress", sync);
    };
  }, []);

  const completedModules = useMemo(() => {
    const moduleIds = new Set<string>();

    for (const node of nodes) {
      const hasPractice = node.scenarios.length > 0;
      const allDone = node.scenarios.every((scenario) =>
        completedScenarios.has(scenario.id),
      );
      if (hasPractice && allDone) moduleIds.add(node.id);
    }

    return moduleIds;
  }, [completedScenarios, nodes]);

  const resetProgress = () => {
    window.localStorage.removeItem(PRACTICE_PROGRESS_KEY);
    window.localStorage.removeItem(LEGACY_COMPLETED_SCENARIOS_KEY);
    setCompletedScenarios(new Set());
    window.dispatchEvent(new Event("driver-labs-progress"));
  };

  return (
    <div className={gridClassName}>
      {nodes.map((node, index) => {
        const isComplete = completedModules.has(node.id);
        const isUnlocked = node.prerequisites.every((id) =>
          completedModules.has(id),
        );
        const completedCount = node.scenarios.filter((scenario) =>
          completedScenarios.has(scenario.id),
        ).length;
        const hasPractice = node.scenarios.length > 0;
        const progress =
          node.scenarios.length > 0
            ? completedCount / node.scenarios.length
            : 0;

        return (
          <article className={cardClassName} key={node.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted-foreground/15 font-bold text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={statusBadgeClass(
                  isComplete ? "done" : isUnlocked ? "ready" : "pending",
                )}
              >
                {isComplete
                  ? "Completado"
                  : isUnlocked
                    ? "Disponible"
                    : "Bloqueado"}
              </span>
            </div>

            <div>
              <h2 className="m-0 text-base font-semibold leading-snug text-foreground">
                {node.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {node.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>{node.lessonCount ?? 0} lecciones</span>
              <span aria-hidden="true">·</span>
              <span>{node.citationCount ?? 0} citas</span>
              <span aria-hidden="true">·</span>
              <span>{node.estimatedMinutes ?? 0} min</span>
            </div>

            {hasPractice ? (
              <div
                aria-label={`${completedCount} de ${node.scenarios.length} escenarios completados`}
                aria-valuemax={node.scenarios.length}
                aria-valuemin={0}
                aria-valuenow={completedCount}
                className="h-2 overflow-hidden rounded-full bg-border/70"
                role="progressbar"
              >
                <span
                  className="block h-full rounded-[inherit] bg-accent"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            ) : (
              <p className="m-0 text-sm italic text-foreground/70">
                {node.lessonCount ?? 0} lecciones · {node.citationCount ?? 0}{" "}
                citas verificables
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/75">
              <span>
                {hasPractice
                  ? `${completedCount}/${node.scenarios.length} escenarios`
                  : `${node.estimatedMinutes ?? 0} min`}
              </span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2">
              {isUnlocked ? (
                <Link className={actionClassName} href={`/modulo/${node.id}`}>
                  <BookOpen aria-hidden="true" size={17} />
                  Abrir
                </Link>
              ) : (
                <span aria-disabled="true" className={disabledActionClassName}>
                  <Lock aria-hidden="true" size={17} />
                  Bloqueado
                </span>
              )}
              {node.scenarios.map((scenario) =>
                isUnlocked ? (
                  <Link
                    className={actionClassName}
                    key={scenario.id}
                    href={`/practicar/${scenario.id}`}
                    title={scenario.title}
                  >
                    <PlayCircle aria-hidden="true" size={17} />
                    Practicar
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={disabledActionClassName}
                    key={scenario.id}
                    title={scenario.title}
                  >
                    <Lock aria-hidden="true" size={17} />
                    Práctica
                  </span>
                ),
              )}
            </div>
          </article>
        );
      })}

      <button
        className="col-span-full inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-semibold text-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted-foreground/10"
        type="button"
        onClick={resetProgress}
      >
        <RotateCcw aria-hidden="true" size={18} />
        Restablecer progreso
      </button>
    </div>
  );
}
