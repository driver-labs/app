"use client";

import dynamic from "next/dynamic";
import type { Scenario } from "@/core/scenario-schema";

const ScenarioPlayer = dynamic(() => import("@/engine/ScenarioPlayer"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

type ScenarioClientProps = {
  scenario: Scenario;
  relatedModules: Array<{ id: string; title: string }>;
};

function SceneSkeleton() {
  return (
    <section className="simulator-shell simulator-shell--loading">
      <div className="stage-skeleton" />
      <aside className="scenario-panel scenario-panel--loading">
        <header className="scenario-panel__header">
          <div className="scenario-panel__status">
            <span>Cargando</span>
            <span>Preparando</span>
          </div>
          <div>
            <p className="eyebrow">Escenario</p>
            <h1>Preparando escena</h1>
          </div>
        </header>
        <div className="sidebar-block sidebar-block--current">
          <span className="skeleton-chip" aria-hidden="true" />
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
}: ScenarioClientProps) {
  return <ScenarioPlayer scenario={scenario} relatedModules={relatedModules} />;
}
