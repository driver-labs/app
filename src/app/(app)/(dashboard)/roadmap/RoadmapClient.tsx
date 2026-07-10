"use client";

import { BookOpen, Check, Lock, PlayCircle, RotateCcw } from "lucide-react";
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

const timelineClassName = "mt-4 flex flex-col gap-3";

const itemClassName = "relative grid grid-cols-[2.5rem_1fr] gap-3 sm:gap-4";

const cardClassName =
  "flex flex-col gap-2.5 rounded-lg border border-border bg-card/80 p-3.5 text-card-foreground transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-secondary/35 hover:shadow-lg";

function railLineClassName(variant: "done" | "pending" | "ready") {
  const color = variant === "done" ? "bg-accent" : "bg-border";
  return `absolute top-10 -bottom-3 left-1/2 w-0.5 -translate-x-1/2 ${color}`;
}

function markerClassName(variant: "done" | "pending" | "ready") {
  const base =
    "relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2";
  if (variant === "done") {
    return `${base} border-accent bg-accent text-accent-foreground`;
  }
  if (variant === "ready") {
    return `${base} border-secondary bg-secondary/15 text-secondary`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

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
    <ol className={timelineClassName}>
      {nodes.map((node, index) => {
        const isComplete = completedModules.has(node.id);
        const isUnlocked =
          isComplete ||
          node.prerequisites.every((id) => completedModules.has(id));
        const completedCount = node.scenarios.filter((scenario) =>
          completedScenarios.has(scenario.id),
        ).length;
        const hasPractice = node.scenarios.length > 0;
        const variant = isComplete ? "done" : isUnlocked ? "ready" : "pending";
        const isLast = index === nodes.length - 1;

        return (
          <li className={itemClassName} key={node.id}>
            <div className="relative flex justify-center">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={railLineClassName(variant)}
                />
              )}
              <span className={markerClassName(variant)}>
                {isComplete ? (
                  <Check aria-hidden="true" size={18} />
                ) : isUnlocked ? (
                  <span className="text-sm font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                ) : (
                  <Lock aria-hidden="true" size={16} />
                )}
              </span>
            </div>

            <article className={cardClassName}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-base font-semibold leading-snug text-foreground">
                  {node.title}
                </h2>
                <span className={statusBadgeClass(variant)}>
                  {isComplete
                    ? "Completado"
                    : isUnlocked
                      ? "Disponible"
                      : "Bloqueado"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <p className="m-0 text-sm font-semibold leading-6 text-muted-foreground">
                  {hasPractice
                    ? `${completedCount}/${node.scenarios.length} prácticas completadas`
                    : `${node.lessonCount ?? 0} lecciones`}
                </p>

                <div className="flex flex-wrap gap-2">
                  {isUnlocked ? (
                    <Link
                      className={actionClassName}
                      href={`/modulo/${node.id}`}
                    >
                      <BookOpen aria-hidden="true" size={17} />
                      Abrir
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={disabledActionClassName}
                    >
                      <Lock aria-hidden="true" size={17} />
                      Bloqueado
                    </span>
                  )}
                  {node.scenarios.map((scenario) =>
                    isUnlocked ? (
                      <Link
                        className={actionClassName}
                        key={scenario.id}
                        href={`/practica/${scenario.id}`}
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
              </div>
            </article>
          </li>
        );
      })}

      <li className="grid grid-cols-[2.5rem_1fr] gap-3 sm:gap-4">
        <span aria-hidden="true" />
        <button
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-semibold text-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted-foreground/10"
          type="button"
          onClick={resetProgress}
        >
          <RotateCcw aria-hidden="true" size={18} />
          Restablecer progreso
        </button>
      </li>
    </ol>
  );
}
