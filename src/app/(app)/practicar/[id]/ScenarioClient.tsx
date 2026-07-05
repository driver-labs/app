"use client";

import dynamic from "next/dynamic";
import PracticeBar from "@/components/PracticeBar";
import type { ScenarioDefinition } from "@/core/scenario-definition";

const ScenarioPlayer = dynamic(() => import("@/engine/ScenarioPlayer"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

type ScenarioLink = {
  id: string;
  title: string;
};

type ScenarioClientProps = {
  scenario: ScenarioDefinition;
  relatedModules: ScenarioLink[];
  otherScenarios?: ScenarioLink[];
  nextScenario?: ScenarioLink | null;
  moduleScenarioCount?: number;
};

function SceneSkeleton() {
  return (
    <section className="simulator-shell simulator-shell--fullscreen simulator-shell--immersive simulator-shell--loading">
      <PracticeBar />
      <div className="stage">
        <div
          className="stage-skeleton stage-skeleton--immersive"
          aria-hidden="true"
        />
        <div
          className="stage-title stage-title--corner complete"
          aria-hidden="true"
        >
          <span className="stage-title__label">Practicar</span>
          <span className="stage-title__text">Preparando escena</span>
        </div>
      </div>
      <aside className="scenario-panel scenario-panel--loading">
        <header className="scenario-panel__header">
          <div className="scenario-panel__status">
            <span>Cargando</span>
            <span>Preparando</span>
          </div>
        </header>
        <div className="sidebar-block sidebar-block--current">
          <div className="scene-loader scene-loader--panel" aria-live="polite">
            <span className="scene-loader__track" aria-hidden="true" />
            <span className="scene-loader__copy">Cargando recursos</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

export default function ScenarioClient({
  scenario,
  relatedModules,
  otherScenarios = [],
  nextScenario = null,
  moduleScenarioCount = 1,
}: ScenarioClientProps) {
  return (
    <ScenarioPlayer
      fullscreen
      scenario={scenario}
      relatedModules={relatedModules}
      otherScenarios={otherScenarios}
      nextScenario={nextScenario}
      moduleScenarioCount={moduleScenarioCount}
    />
  );
}
