"use client";

import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Eye,
  ListChecks,
  Pause,
  PlayCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import PracticeBar from "@/components/PracticeBar";
import {
  applyScenarioAttempt,
  buildScenarioAttempt,
  emptyPracticeProgress,
  isCorrectScenarioSelection,
  LEGACY_COMPLETED_SCENARIOS_KEY,
  PRACTICE_PROGRESS_KEY,
  type PracticeProgressStore,
  type UserModuleProgress,
  type UserScenarioAttempt,
} from "@/core/practice-progress";
import type { ScenarioDefinition } from "@/core/scenario-definition";
import type { Scenario as PlayableScenario } from "@/core/scenario-schema";
import { toPlayableScenario } from "@/core/scenarios";
import type { SceneView } from "./camera/views";
import { getSceneView } from "./camera/views";
import type { Pack } from "./models/cars";
import { PACKS } from "./models/cars";
import BusStopScene from "./scenes/BusStopScene";
import DistractionScene from "./scenes/DistractionScene";
import IntersectionScene from "./scenes/IntersectionScene";
import LaneChangeScene from "./scenes/LaneChangeScene";
import OvertakeScene from "./scenes/OvertakeScene";
import RainBrakingScene from "./scenes/RainBrakingScene";
import RoundaboutScene from "./scenes/RoundaboutScene";
import type { Phase } from "./types";

type DecisionSceneProps = {
  phase: Phase;
  correct: boolean;
  scenario: PlayableScenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

// Todas comparten el mismo contrato de props que IntersectionScene. Lo que no
// tiene componente dedicado (intersection-light, crosswalk, curve) cae en
// IntersectionScene, igual que antes de este lookup.
const DECISION_SCENE_COMPONENTS: Partial<
  Record<PlayableScenario["sceneKind"], ComponentType<DecisionSceneProps>>
> = {
  roundabout: RoundaboutScene,
  "bus-stop": BusStopScene,
  "lane-change": LaneChangeScene,
  "rain-braking": RainBrakingScene,
  distraction: DistractionScene,
};

// Qué vehículo/actor mirar durante el approach, por tipo de escena. Sin esto
// el hint era un genérico "el vehículo se aproxima al punto de conflicto" que
// no decía a qué prestarle atención.
const APPROACH_HINTS: Partial<Record<PlayableScenario["sceneKind"], string>> = {
  "intersection-stop":
    "Prestá atención al tráfico que cruza — la prioridad se define por quién llegó primero.",
  "intersection-light":
    "Mirá el semáforo y el tráfico que cruza antes de decidir.",
  "straight-overtake":
    "Fijate en el vehículo que viene de frente antes de adelantar.",
  crosswalk: "Prestá atención a los peatones que pueden cruzar.",
  roundabout:
    "Mirá los vehículos que ya circulan dentro de la rotonda — tienen prioridad.",
  curve: "Prestá atención a la curva y a lo que pueda venir de frente.",
  "bus-stop": "Fijate si hay peatones ocultos frente al bus detenido.",
  "lane-change":
    "Revisá tu punto ciego — puede haber una moto antes de cambiar de carril.",
  "rain-braking":
    "Prestá atención a la distancia con el vehículo de adelante; el pavimento está mojado.",
  distraction: "Notá la distracción al volante que pone en riesgo la decisión.",
};

const TITLE_TYPING_MS = 44;

type RelatedModuleLink = {
  id: string;
  title: string;
};

type ScenarioPlayerProps = {
  scenario: ScenarioDefinition;
  relatedModules?: RelatedModuleLink[];
  otherScenarios?: RelatedModuleLink[];
  fullscreen?: boolean;
};

const difficultyLabel: Record<PlayableScenario["difficulty"], string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

function readPracticeProgress(): PracticeProgressStore {
  if (typeof window === "undefined") return emptyPracticeProgress();

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

function writePracticeProgress(store: PracticeProgressStore) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("driver-labs-progress"));
}

function readModuleProgress(moduleId: string): UserModuleProgress | null {
  return readPracticeProgress().modules[moduleId] ?? null;
}

function syncLegacyCompletion(scenarioId: string) {
  if (typeof window === "undefined") return;

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(LEGACY_COMPLETED_SCENARIOS_KEY) ?? "[]",
    );
    const completed = new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [],
    );
    completed.add(scenarioId);
    window.localStorage.setItem(
      LEGACY_COMPLETED_SCENARIOS_KEY,
      JSON.stringify([...completed]),
    );
  } catch {
    window.localStorage.setItem(
      LEGACY_COMPLETED_SCENARIOS_KEY,
      JSON.stringify([scenarioId]),
    );
  }
}

function hasLegacyCompletion(scenarioId: string) {
  if (typeof window === "undefined") return false;

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(LEGACY_COMPLETED_SCENARIOS_KEY) ?? "[]",
    );
    return Array.isArray(parsed) && parsed.includes(scenarioId);
  } catch {
    return false;
  }
}

function SceneLoader() {
  return (
    <Html fullscreen>
      <div className="stage-skeleton stage-skeleton--canvas">
        <div className="scene-loader" aria-live="polite">
          <span className="scene-loader__track" aria-hidden="true" />
          <span className="scene-loader__copy">Cargando escena</span>
        </div>
      </div>
    </Html>
  );
}

export default function ScenarioPlayer({
  scenario,
  relatedModules = [],
  otherScenarios = [],
  fullscreen = false,
}: ScenarioPlayerProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typedTitleLength, setTypedTitleLength] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [moduleProgress, setModuleProgress] =
    useState<UserModuleProgress | null>(null);
  const [lastAttempt, setLastAttempt] = useState<UserScenarioAttempt | null>(
    null,
  );
  const [attemptStartedAt, setAttemptStartedAt] = useState(() =>
    new Date().toISOString(),
  );

  const playableScenario = useMemo(
    () => toPlayableScenario(scenario),
    [scenario],
  );
  const pack = PACKS.kenney;
  const view = getSceneView(playableScenario.sceneKind);
  const DecisionScene =
    DECISION_SCENE_COMPONENTS[playableScenario.sceneKind] ?? IntersectionScene;
  const correct = useMemo(
    () => isCorrectScenarioSelection(scenario, selectedIds),
    [scenario, selectedIds],
  );
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setPhase("intro");
    setTypedTitleLength(0);
    setSelectedIds([]);
    setRunKey((key) => key + 1);
    setLastAttempt(null);
    setAttemptStartedAt(new Date().toISOString());

    const progress = readModuleProgress(scenario.moduleBinding.moduleId);
    setModuleProgress(progress);
    setCompleted(
      progress?.status === "completed" ||
        progress?.status === "mastered" ||
        hasLegacyCompletion(scenario.id),
    );
  }, [scenario.id, scenario.moduleBinding.moduleId]);

  useEffect(() => {
    if (phase !== "intro") return;

    const fullLength = scenario.title.length;
    if (typedTitleLength >= fullLength) {
      const doneTimer = window.setTimeout(() => setPhase("approach"), 260);
      return () => window.clearTimeout(doneTimer);
    }

    const timer = window.setTimeout(
      () => {
        setTypedTitleLength((length) => Math.min(fullLength, length + 1));
      },
      typedTitleLength === 0 ? 320 : TITLE_TYPING_MS,
    );

    return () => window.clearTimeout(timer);
  }, [phase, scenario.title, typedTitleLength]);

  const restart = () => {
    setSelectedIds([]);
    setTypedTitleLength(0);
    setPhase("intro");
    setRunKey((key) => key + 1);
    setAttemptStartedAt(new Date().toISOString());
  };

  const finishSelection = (nextSelectedIds: string[]) => {
    setSelectedIds(nextSelectedIds);
    const completedAt = new Date().toISOString();
    const attempt = buildScenarioAttempt({
      completedAt,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${scenario.id}-${Date.now()}`,
      scenario,
      selectedOptionIds: nextSelectedIds,
      startedAt: attemptStartedAt,
      userId: "local",
    });
    const nextProgress = applyScenarioAttempt(
      readPracticeProgress(),
      attempt,
      1,
    );

    writePracticeProgress(nextProgress);
    setLastAttempt(attempt);
    setModuleProgress(nextProgress.modules[scenario.moduleBinding.moduleId]);

    if (attempt.passed) {
      syncLegacyCompletion(scenario.id);
      setCompleted(true);
    }

    void fetch("/api/practice/attempts", {
      body: JSON.stringify(attempt),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);

    setPhase("consequence");
  };

  const toggleMultiple = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((choiceId) => choiceId !== id)
        : [...current, id],
    );
  };

  const hint =
    playableScenario.format === "diagnosis"
      ? "Observá la maniobra y respondé cuando la escena se pause."
      : (APPROACH_HINTS[playableScenario.sceneKind] ??
        "El vehículo se aproxima al punto de conflicto.");
  const selectionHelp =
    playableScenario.selectionType === "multiple"
      ? "Podés marcar más de una opción antes de confirmar."
      : "Elegí una sola respuesta.";
  const typedTitle = scenario.title.slice(0, typedTitleLength);
  const titleTypingDone = typedTitleLength >= scenario.title.length;
  const showStageTitle =
    fullscreen || phase === "intro" || phase === "approach";
  const stageTitleText =
    fullscreen && phase === "intro" && !titleTypingDone
      ? typedTitle
      : scenario.title;

  const practiceLabel = fullscreen ? "Practicar" : "Escenario";

  return (
    <section
      className={
        fullscreen
          ? "simulator-shell simulator-shell--fullscreen simulator-shell--immersive"
          : "simulator-shell"
      }
      aria-label={scenario.title}
      data-phase={phase}
    >
      {fullscreen && <PracticeBar />}

      <div className="stage">
        <Canvas
          aria-label={`Escena 3D interactiva: ${scenario.title}. ${hint}`}
          key={runKey}
          role="img"
          shadows
          camera={{ position: view.camera, fov: view.fov }}
          gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        >
          <Suspense fallback={<SceneLoader />}>
            {playableScenario.sceneKind === "straight-overtake" ? (
              <OvertakeScene
                phase={phase}
                scenario={playableScenario}
                pack={pack}
                view={view}
                onDone={() => setPhase("decision")}
              />
            ) : (
              <DecisionScene
                phase={phase}
                correct={correct}
                scenario={playableScenario}
                layoutSeed={scenario.id}
                pack={pack}
                view={view}
                onReachStop={() => setPhase("decision")}
              />
            )}
          </Suspense>
        </Canvas>

        {showStageTitle && (
          <div
            className={
              fullscreen
                ? phase === "intro" && !titleTypingDone
                  ? "stage-title stage-title--corner typing"
                  : "stage-title stage-title--corner complete"
                : titleTypingDone
                  ? "stage-title complete"
                  : "stage-title typing"
            }
            data-intro={titleTypingDone ? "done" : "typing"}
            aria-live="polite"
          >
            <span className="stage-title__label">{practiceLabel}</span>
            <span className="stage-title__text">{stageTitleText}</span>
          </div>
        )}

        {phase === "decision" && (
          <div
            className={
              fullscreen
                ? "pause-overlay pause-overlay--immersive"
                : "pause-overlay"
            }
          >
            <Pause
              className="pause-icon"
              aria-hidden="true"
              size={28}
              strokeWidth={2.5}
            />
            <span className="pause-label">EN PAUSA</span>
          </div>
        )}
      </div>

      <aside className="scenario-panel">
        <header className="scenario-panel__header">
          <div className="scenario-panel__status">
            <span>
              Dificultad {difficultyLabel[playableScenario.difficulty]}
            </span>
            <span
              className={completed ? "status-pill complete" : "status-pill"}
            >
              {completed ? "Completado" : "En práctica"}
            </span>
          </div>
          {!fullscreen && (
            <div>
              <p className="eyebrow">{practiceLabel}</p>
              <h1>{scenario.title}</h1>
            </div>
          )}
        </header>

        {phase === "approach" && (
          <section className="sidebar-block sidebar-block--current">
            <p className="sidebar-block__title">
              <Eye aria-hidden="true" size={16} />
              Qué observar
            </p>
            <p className="instruction-text">{hint}</p>
            <p className="task-help">
              La escena se pausará cuando llegue el momento de responder.
            </p>
          </section>
        )}

        {phase === "decision" && (
          <section className="sidebar-block sidebar-block--current">
            <p className="sidebar-block__title">
              <ListChecks aria-hidden="true" size={16} />
              Tu decisión
            </p>
            <h2 className="prompt">{playableScenario.prompt}</h2>
            <p className="task-help">{selectionHelp}</p>
            <div className="choices">
              {playableScenario.choices.map((choice, index) => {
                const isSelected = selected.has(choice.id);
                return (
                  <button
                    className={isSelected ? "choice selected" : "choice"}
                    key={choice.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      playableScenario.selectionType === "multiple"
                        ? toggleMultiple(choice.id)
                        : finishSelection([choice.id])
                    }
                  >
                    <span className="choice-index" aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{choice.label}</span>
                  </button>
                );
              })}
            </div>
            {playableScenario.selectionType === "multiple" && (
              <button
                className="primary-action"
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => finishSelection(selectedIds)}
              >
                <CheckCircle2 aria-hidden="true" size={18} />
                Confirmar respuesta
              </button>
            )}
          </section>
        )}

        {phase === "consequence" && (
          <section className="sidebar-block sidebar-block--current">
            <p className="sidebar-block__title">
              {correct ? (
                <CheckCircle2 aria-hidden="true" size={16} />
              ) : (
                <XCircle aria-hidden="true" size={16} />
              )}
              Resultado
            </p>
            <div className={correct ? "result-box ok" : "result-box bad"}>
              <p className="result">
                {correct ? (
                  <CheckCircle2 aria-hidden="true" size={22} />
                ) : (
                  <XCircle aria-hidden="true" size={22} />
                )}
                {correct
                  ? playableScenario.feedback.success
                  : playableScenario.feedback.fail}
              </p>
              <p className="rule">
                <CircleAlert aria-hidden="true" size={18} />
                <span>
                  <strong>Regla:</strong> {playableScenario.rule}
                </span>
              </p>
              {playableScenario.lawRefs.length > 0 && (
                <ul className="law-refs">
                  {playableScenario.lawRefs.map((ref) => (
                    <li key={`${ref.code}-${ref.summary}`}>
                      <strong>{ref.code}</strong>: {ref.summary}
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="primary-action"
                type="button"
                onClick={restart}
              >
                <RotateCcw aria-hidden="true" size={18} />
                Reintentar
              </button>
            </div>
          </section>
        )}

        <dl className="scenario-panel__context" aria-label="Resumen">
          <dt>Modo</dt>
          <dd>
            {playableScenario.format === "diagnosis"
              ? "Diagnóstico"
              : "Decisión"}
          </dd>
          <dt>Respuesta</dt>
          <dd>
            {playableScenario.selectionType === "multiple" ? "Varias" : "Única"}
          </dd>
          <dt>Ultimo puntaje</dt>
          <dd>
            {lastAttempt?.score ?? moduleProgress?.lastScore ?? "Sin intentos"}
          </dd>
          <dt>Mejor puntaje</dt>
          <dd>{moduleProgress?.bestScore ?? "Sin intentos"}</dd>
          <dt>Intentos</dt>
          <dd>{moduleProgress?.attemptsCount ?? 0}</dd>
          <dt>Lecciones practicadas</dt>
          <dd>{moduleProgress?.lessonsPracticed.length ?? 0}</dd>
        </dl>

        {relatedModules.length > 0 && (
          <nav className="related-links" aria-label="Módulos relacionados">
            <p className="sidebar-block__title">
              <BookOpen aria-hidden="true" size={16} />
              Repasar teoría
            </p>
            {relatedModules.map((module) => (
              <Link key={module.id} href={`/modulo/${module.id}`}>
                <BookOpen aria-hidden="true" size={17} />
                {module.title}
              </Link>
            ))}
          </nav>
        )}

        {otherScenarios.length > 0 && (
          <nav className="related-links" aria-label="Más prácticas">
            <p className="sidebar-block__title">
              <PlayCircle aria-hidden="true" size={16} />
              Más prácticas
            </p>
            {otherScenarios.map((item) => (
              <Link key={item.id} href={`/practicar/${item.id}`}>
                <PlayCircle aria-hidden="true" size={17} />
                {item.title}
              </Link>
            ))}
          </nav>
        )}
      </aside>
    </section>
  );
}
