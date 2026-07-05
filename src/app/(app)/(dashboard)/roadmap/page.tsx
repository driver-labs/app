import { Map as MapIcon } from "lucide-react";
import { getLearningModules } from "@/lib/content/modules";
import RoadmapClient, { type RoadmapNode } from "./RoadmapClient";

export const metadata = {
  title: "Roadmap | DriverLab",
};

export default function RoadmapPage() {
  const nodes: RoadmapNode[] = getLearningModules().map((module) => ({
    citationCount: module.didacticContent?.citations.length ?? 0,
    estimatedMinutes: module.estimatedMinutes,
    id: module.id,
    lessonCount: module.didacticContent?.lessons.length ?? 0,
    prerequisites: [],
    scenarios: [],
    summary: module.summary,
    title: module.didacticContent?.headline ?? module.title,
  }));

  return (
    <section className="roadmap-panel" aria-label="Roadmap de módulos">
      <div className="roadmap-panel__heading">
        <div>
          <p className="eyebrow">
            <MapIcon aria-hidden="true" size={14} />
            Ruta recomendada
          </p>
          <h1>Conocimiento legal con RAG y citas</h1>
          <p>
            Los módulos se alimentan del cerebro documental validado en Supabase
            y se abren desde este roadmap con contenido didáctico, práctica y
            evidencia trazable.
          </p>
        </div>
        <span>{nodes.length} pasos</span>
      </div>
      <RoadmapClient nodes={nodes} />
    </section>
  );
}
