import { Map as MapIcon } from "lucide-react";
import { getLearningModules } from "@/lib/content/modules";
import RoadmapClient, { type RoadmapNode } from "./RoadmapClient";

export const metadata = {
  title: "Roadmap | DriverLab",
};

export default function RoadmapPage() {
  const nodes: RoadmapNode[] = getLearningModules().map((module) => ({
    id: module.id,
    prerequisites: [],
    scenarios: [],
    summary: module.summary,
    title: module.title,
  }));

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-10 text-[#0d1321]">
      <section className="mx-auto max-w-6xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          <MapIcon aria-hidden="true" size={14} />
          Roadmap
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
          Ruta de aprendizaje desde la base documental.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Los modulos se ordenan desde fundamentos legales hasta practica para
          examen. Cada paso abre su contenido curado desde
          <code className="mx-1 rounded bg-slate-200 px-1">
            content/knowledge-base/modules
          </code>
          .
        </p>
        <div className="mt-10">
          <RoadmapClient nodes={nodes} />
        </div>
      </section>
    </main>
  );
}
