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
import PracticeBar from "@/components/PracticeBar";
import type { Scenario } from "@/core/scenario-schema";
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
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

// Todas comparten el mismo contrato de props que IntersectionScene. Lo que no
// tiene componente dedicado (intersection-light, crosswalk, curve) cae en
// IntersectionScene, igual que antes de este lookup.
const DECISION_SCENE_COMPONENTS: Partial<
  Record<Scenario["sceneKind"], ComponentType<DecisionSceneProps>>
> = {
  roundabout: RoundaboutScene,
  "bus-stop": BusStopScene,
  "lane-change": LaneChangeScene,
  "rain-braking": RainBrakingScene,
  distraction: DistractionScene,
};

const PROGRESS_KEY = "driver-labs:completed-scenarios";
const TITLE_TYPING_MS = 44;

type RelatedModuleLink = {
  id: string;
  title: string;
};

type ScenarioPlayerProps = {
  scenario: Scenario;
  relatedModules?: RelatedModuleLink[];
  otherScenarios?: RelatedModuleLink[];
  fullscreen?: boolean;
};

const difficultyLabel: Record<Scenario["difficulty"], string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

function readCompletedScenarioIds(): Set<string> {
  if (typeof window === "undefined") return new Set();

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

function writeCompletedScenario(id: string) {
  if (typeof window === "undefined") return;

  const completed = readCompletedScenarioIds();
  completed.add(id);
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed]));
  window.dispatchEvent(new Event("driver-labs-progress"));
}

function isCorrectSelection(scenario: Scenario, selectedIds: string[]) {
  if (selectedIds.length === 0) return false;
  const selected = new Set(selectedIds);

  return scenario.choices.every((choice) =>
    choice.correct ? selected.has(choice.id) : !selected.has(choice.id),
  );
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

  const pack = PACKS.kenney;
  const view = getSceneView(scenario.sceneKind);
  const DecisionScene =
    DECISION_SCENE_COMPONENTS[scenario.sceneKind] ?? IntersectionScene;
  const correct = useMemo(
    () => isCorrectSelection(scenario, selectedIds),
    [scenario, selectedIds],
  );
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setPhase("intro");
    setTypedTitleLength(0);
    setSelectedIds([]);
    setRunKey((key) => key + 1);
    setCompleted(readCompletedScenarioIds().has(scenario.id));
  }, [scenario.id]);

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
  };

  const finishSelection = (nextSelectedIds: string[]) => {
    setSelectedIds(nextSelectedIds);
    const answeredCorrectly = isCorrectSelection(scenario, nextSelectedIds);
    if (answeredCorrectly) {
      writeCompletedScenario(scenario.id);
      setCompleted(true);
    }
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
    scenario.format === "diagnosis"
      ? "Observá la maniobra y respondé cuando la escena se pause."
      : "El vehículo se aproxima al punto de conflicto.";
  const selectionHelp =
    scenario.selectionType === "multiple"
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
    >
      {fullscreen && <PracticeBar />}

      <div className="stage">
        <Canvas
          aria-label={`Escena 3D interactiva: ${scenario.title}. ${hint}`}
          key={runKey}
          role="img"
          shadows
          camera={{ position: view.camera, fov: view.fov }}
        >
          <Suspense fallback={<SceneLoader />}>
            {scenario.sceneKind === "straight-overtake" ? (
              <OvertakeScene
                phase={phase}
                scenario={scenario}
                pack={pack}
                view={view}
                onDone={() => setPhase("decision")}
              />
            ) : (
              <DecisionScene
                phase={phase}
                correct={correct}
                scenario={scenario}
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
            <span>Dificultad {difficultyLabel[scenario.difficulty]}</span>
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
            <h2 className="prompt">{scenario.prompt}</h2>
            <p className="task-help">{selectionHelp}</p>
            <div className="choices">
              {scenario.choices.map((choice, index) => {
                const isSelected = selected.has(choice.id);
                return (
                  <button
                    className={isSelected ? "choice selected" : "choice"}
                    key={choice.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      scenario.selectionType === "multiple"
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
            {scenario.selectionType === "multiple" && (
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
                {correct ? scenario.feedback.success : scenario.feedback.fail}
              </p>
              <p className="rule">
                <CircleAlert aria-hidden="true" size={18} />
                <span>
                  <strong>Regla:</strong> {scenario.rule}
                </span>
              </p>
              {scenario.lawRefs.length > 0 && (
                <ul className="law-refs">
                  {scenario.lawRefs.map((ref) => (
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
            {scenario.format === "diagnosis" ? "Diagnóstico" : "Decisión"}
          </dd>
          <dt>Respuesta</dt>
          <dd>{scenario.selectionType === "multiple" ? "Varias" : "Única"}</dd>
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
