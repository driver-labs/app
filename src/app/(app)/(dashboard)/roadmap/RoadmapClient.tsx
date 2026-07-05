"use client";

import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  RotateCcw,
  Unlock,
} from "lucide-react";
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
    <div className="roadmap-list">
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
        const StatusIcon = isComplete
          ? CheckCircle2
          : isUnlocked
            ? Unlock
            : Lock;

        return (
          <article
            className={
              isComplete
                ? "roadmap-node complete"
                : isUnlocked
                  ? "roadmap-node unlocked"
                  : "roadmap-node locked"
            }
            key={node.id}
          >
            <div className="roadmap-node__index">{index + 1}</div>
            <div className="roadmap-node__body">
              <div className="roadmap-node__heading">
                <div>
                  <p className="eyebrow roadmap-status">
                    <StatusIcon aria-hidden="true" size={14} />
                    {isComplete
                      ? "completado"
                      : isUnlocked
                        ? "disponible"
                        : "bloqueado"}
                  </p>
                  <h2>{node.title}</h2>
                </div>
                <span>
                  {hasPractice
                    ? `${completedCount}/${node.scenarios.length}`
                    : `${node.estimatedMinutes ?? 0} min`}
                </span>
              </div>
              <p>{node.summary}</p>
              {hasPractice ? (
                <div
                  aria-label={`${completedCount} de ${node.scenarios.length} escenarios completados`}
                  aria-valuemax={node.scenarios.length}
                  aria-valuemin={0}
                  aria-valuenow={completedCount}
                  className="progress-track"
                  role="progressbar"
                >
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              ) : (
                <p className="muted">
                  {node.lessonCount ?? 0} lecciones · {node.citationCount ?? 0}{" "}
                  citas verificables
                </p>
              )}
              <div className="roadmap-actions">
                {isUnlocked ? (
                  <Link href={`/modulo/${node.id}`}>
                    <BookOpen aria-hidden="true" size={17} />
                    Abrir módulo
                  </Link>
                ) : (
                  <span aria-disabled="true" className="disabled-link">
                    <Lock aria-hidden="true" size={17} />
                    Completa prerequisitos
                  </span>
                )}
                {node.scenarios.map((scenario) =>
                  isUnlocked ? (
                    <Link key={scenario.id} href={`/practicar/${scenario.id}`}>
                      <PlayCircle aria-hidden="true" size={17} />
                      {scenario.title}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="disabled-link"
                      key={scenario.id}
                    >
                      <Lock aria-hidden="true" size={17} />
                      {scenario.title}
                    </span>
                  ),
                )}
              </div>
            </div>
          </article>
        );
      })}

      <button
        className="secondary-action"
        type="button"
        onClick={resetProgress}
      >
        <RotateCcw aria-hidden="true" size={18} />
        Restablecer progreso
      </button>
    </div>
  );
}
