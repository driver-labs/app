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

const PROGRESS_KEY = "driver-labs:completed-scenarios";

export type RoadmapNode = {
  id: string;
  title: string;
  summary: string;
  prerequisites: string[];
  scenarios: Array<{ id: string; title: string }>;
};

type RoadmapClientProps = {
  nodes: RoadmapNode[];
};

function readCompletedScenarioIds(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(PROGRESS_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((item): item is string => typeof item === "string"),
    );
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
    window.localStorage.removeItem(PROGRESS_KEY);
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
                  {completedCount}/{node.scenarios.length}
                </span>
              </div>
              <p>{node.summary}</p>
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
