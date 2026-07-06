import { Map as MapIcon } from "lucide-react";
import { getScenariosForModule } from "@/core/scenarios";
import { getLearningModules } from "@/lib/content/modules";
import RoadmapClient, { type RoadmapNode } from "./RoadmapClient";

export const metadata = {
  title: "Ruta | DriverLab",
};

export default function RoadmapPage() {
  const modules = getLearningModules();
  const nodes: RoadmapNode[] = modules.map((module, index) => {
    const scenarios = getScenariosForModule(module.id).map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
    }));

    return {
      citationCount: module.didacticContent?.citations.length ?? 0,
      estimatedMinutes: module.estimatedMinutes,
      id: module.id,
      lessonCount: module.didacticContent?.lessons.length ?? 0,
      prerequisites: index === 0 ? [] : [modules[index - 1].id],
      scenarios,
      summary: module.summary,
      title: module.title,
    };
  });

  return (
    <section className="roadmap-panel" aria-label="Ruta de aprendizaje">
      <div className="roadmap-panel__heading">
        <div>
          <p className="eyebrow">
            <MapIcon aria-hidden="true" size={14} />
            Ruta recomendada
          </p>
          <h1>Tu ruta de aprendizaje</h1>
          <p>
            Avanzá por módulos cortos, practicá decisiones reales y reforzá lo
            que todavía cuesta antes de salir a la calle.
          </p>
        </div>
        <span>{nodes.length} módulos</span>
      </div>
      <RoadmapClient nodes={nodes} />
    </section>
  );
}
