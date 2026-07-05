import { Map as MapIcon } from "lucide-react";
import { scenariosForModule } from "@/core/links";
import { knowledgeModules, sortModulesTopologically } from "@/core/modules";
import { scenarios } from "@/core/scenarios";
import RoadmapClient, { type RoadmapNode } from "./RoadmapClient";

export const metadata = {
  title: "Roadmap | Driver Labs",
};

export default function RoadmapPage() {
  const nodes: RoadmapNode[] = sortModulesTopologically(knowledgeModules).map(
    (module) => ({
      id: module.id,
      title: module.title,
      summary: module.summary,
      prerequisites: module.prerequisites,
      scenarios: scenariosForModule(module, scenarios).map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
      })),
    }),
  );

  return (
    <section className="roadmap-panel" aria-label="Roadmap de módulos">
      <div className="roadmap-panel__heading">
        <div>
          <p className="eyebrow">
            <MapIcon aria-hidden="true" size={14} />
            Ruta recomendada
          </p>
          <h1>Conocimiento legal y práctica 3D</h1>
          <p>
            Los módulos se ordenan por prerequisitos y se desbloquean desde
            los escenarios completados.
          </p>
        </div>
        <span>{nodes.length} pasos</span>
      </div>
      <RoadmapClient nodes={nodes} />
    </section>
  );
}
