"use client";

import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ListChecks,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import type { Pack } from "./models/cars";
import { PACKS } from "./models/cars";
import BusStopScene from "./scenes/BusStopScene";
import CrosswalkScene from "./scenes/CrosswalkScene";
import DistractionScene from "./scenes/DistractionScene";
import DocumentCheckpointScene from "./scenes/DocumentCheckpointScene";
import IntersectionScene from "./scenes/IntersectionScene";
import LaneChangeScene from "./scenes/LaneChangeScene";
import OvertakeScene from "./scenes/OvertakeScene";
import RainBrakingScene from "./scenes/RainBrakingScene";
import RoundaboutScene from "./scenes/RoundaboutScene";
import type { Phase } from "./types";
import { useNarration } from "./useNarration";

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
  crosswalk: CrosswalkScene,
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
  nextScenario?: RelatedModuleLink | null;
  moduleScenarioCount?: number;
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
  nextScenario = null,
  moduleScenarioCount = 1,
  fullscreen = false,
}: ScenarioPlayerProps) {
  const decisionPanelRef = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typedTitleLength, setTypedTitleLength] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<UserScenarioAttempt | null>(
    null,
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() =>
    new Date().toISOString(),
  );
  const {
    enabled: narrationEnabled,
    setEnabled: setNarrationEnabled,
    speak: narrate,
  } = useNarration();

  const playableScenario = useMemo(
    () => toPlayableScenario(scenario),
    [scenario],
  );
  const pack = PACKS.kenney;
  const view = useMemo<SceneView>(
    () => ({
      camera: scenario.simulation.camera.position,
      fov: scenario.simulation.camera.fov,
      target: scenario.simulation.camera.lookAt,
    }),
    [scenario],
  );
  const DecisionScene =
    scenario.simulation.pattern === "document_checkpoint"
      ? DocumentCheckpointScene
      : (DECISION_SCENE_COMPONENTS[playableScenario.sceneKind] ??
        IntersectionScene);
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
    setSyncMessage(null);
    setAttemptStartedAt(new Date().toISOString());

    const progress = readModuleProgress(scenario.moduleBinding.moduleId);
    setCompleted(
      progress?.status === "completed" ||
        progress?.status === "mastered" ||
        hasLegacyCompletion(scenario.id),
    );
  }, [scenario.id, scenario.moduleBinding.moduleId]);

  useEffect(() => {
    if (phase === "approach") {
      setAttemptStartedAt(new Date().toISOString());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "decision") {
      decisionPanelRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "intro") return;

    const fullLength = scenario.title.length;
    if (fullscreen) {
      const doneTimer = window.setTimeout(() => {
        setTypedTitleLength(fullLength);
        setPhase("approach");
      }, 700);
      return () => window.clearTimeout(doneTimer);
    }

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
  }, [fullscreen, phase, scenario.title, typedTitleLength]);

  const restart = () => {
    setSelectedIds([]);
    setTypedTitleLength(0);
    setPhase("intro");
    setRunKey((key) => key + 1);
    setSyncMessage(null);
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
      moduleScenarioCount,
    );

    writePracticeProgress(nextProgress);
    setLastAttempt(attempt);

    if (attempt.passed) {
      syncLegacyCompletion(scenario.id);
      setCompleted(true);
    }

    setSyncMessage("Intento guardado en este dispositivo.");

    void fetch("/api/practice/attempts", {
      body: JSON.stringify(attempt),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          setSyncMessage("Intento sincronizado con tu cuenta.");
          toast.success("Intento sincronizado con tu cuenta.");
          return;
        }

        const message =
          response.status === 401
            ? "Guardado en este dispositivo. Iniciá sesión para sincronizar tu progreso."
            : "Guardado en este dispositivo. No se pudo sincronizar con el servidor.";
        setSyncMessage(message);
        toast.info(message);
      })
      .catch(() => {
        const message =
          "Guardado en este dispositivo. No se pudo sincronizar con el servidor.";
        setSyncMessage(message);
        toast.warning(message);
      });

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
      : "Seleccioná una opción y confirmá tu decisión.";
  const questionHelp =
    phase === "decision"
      ? selectionHelp
      : "La pregunta está disponible desde el inicio; observá la escena si necesitás más contexto.";

  const narrationText =
    phase === "approach"
      ? hint
      : phase === "decision"
        ? playableScenario.prompt
        : phase === "consequence"
          ? correct
            ? playableScenario.feedback.success
            : playableScenario.feedback.fail
          : null;

  useEffect(() => {
    if (narrationText) void narrate(narrationText);
  }, [narrationText, narrate]);
  const typedTitle = scenario.title.slice(0, typedTitleLength);
  const titleTypingDone = typedTitleLength >= scenario.title.length;
  const showStageTitle =
    fullscreen || phase === "intro" || phase === "approach";
  const stageTitleText =
    !fullscreen && phase === "intro" && !titleTypingDone
      ? typedTitle
      : scenario.title;

  const practiceLabel = fullscreen ? "Práctica" : "Escenario";

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
      {fullscreen && <h1 className="sr-only">{scenario.title}</h1>}

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
                ? "stage-title stage-title--corner complete"
                : titleTypingDone
                  ? "stage-title complete"
                  : "stage-title typing"
            }
            data-intro={titleTypingDone ? "done" : "typing"}
            aria-live={titleTypingDone ? "polite" : "off"}
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
            <button
              className="narration-toggle"
              type="button"
              aria-pressed={narrationEnabled}
              title={
                narrationEnabled ? "Silenciar narración" : "Activar narración"
              }
              onClick={() => setNarrationEnabled((value) => !value)}
            >
              {narrationEnabled ? (
                <Volume2 aria-hidden="true" size={16} />
              ) : (
                <VolumeX aria-hidden="true" size={16} />
              )}
              <span className="sr-only">
                {narrationEnabled ? "Silenciar narración" : "Activar narración"}
              </span>
            </button>
          </div>
          {!fullscreen && (
            <div>
              <p className="eyebrow">{practiceLabel}</p>
              <h1>{scenario.title}</h1>
            </div>
          )}
        </header>

        {phase !== "consequence" && (
          <section
            ref={phase === "decision" ? decisionPanelRef : undefined}
            className="sidebar-block sidebar-block--current"
            tabIndex={-1}
            aria-live={phase === "decision" ? "polite" : undefined}
          >
            <p className="sidebar-block__title">
              <ListChecks aria-hidden="true" size={16} />
              Tu decisión
            </p>
            <h2 className="prompt">{playableScenario.prompt}</h2>
            <p className="task-help">{questionHelp}</p>
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
                        : setSelectedIds([choice.id])
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
            <button
              className="primary-action"
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => finishSelection(selectedIds)}
            >
              <CheckCircle2 aria-hidden="true" size={18} />
              {playableScenario.selectionType === "multiple"
                ? "Confirmar respuestas"
                : "Confirmar decisión"}
            </button>
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
                  <strong>Para recordar:</strong> {playableScenario.rule}
                </span>
              </p>
              {lastAttempt && (
                <p className="score-line">
                  Resultado: <strong>{lastAttempt.score}/100</strong>
                </p>
              )}
              {!correct && scenario.learning.feedback.hints.length > 0 && (
                <details className="review-details">
                  <summary>Qué revisar</summary>
                  <ul>
                    {scenario.learning.feedback.hints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              {syncMessage && <p className="sync-note">{syncMessage}</p>}
              <div className="result-actions">
                <button
                  className="primary-action secondary-action"
                  type="button"
                  onClick={restart}
                >
                  <RotateCcw aria-hidden="true" size={18} />
                  Reintentar
                </button>
                {correct && nextScenario && (
                  <Link
                    className="primary-action"
                    href={`/practica/${nextScenario.id}`}
                  >
                    <ArrowRight aria-hidden="true" size={18} />
                    Siguiente práctica
                  </Link>
                )}
                {correct && relatedModules[0] && (
                  <Link
                    className="primary-action secondary-action"
                    href={`/modulo/${relatedModules[0].id}`}
                  >
                    <BookOpen aria-hidden="true" size={18} />
                    Volver al módulo
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}
      </aside>
    </section>
  );
}
