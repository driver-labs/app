import { Car, Map as MapIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
  const firstScenarioId = scenarios[0]?.id ?? "stop-01";

  return (
    <main className="page-shell">
      <header className="dashboard-topbar">
        <Link className="dashboard-brand" href="/roadmap">
          <Image
            alt="DriverLab"
            className="dashboard-brand__logo"
            height={337}
            priority
            src="/brand/driverlab-logo.png"
            width={741}
          />
        </Link>
        <nav className="dashboard-nav" aria-label="Navegación principal">
          <Link aria-current="page" href="/roadmap">
            <MapIcon aria-hidden="true" size={17} />
            Roadmap
          </Link>
          <Link href={`/escenario/${firstScenarioId}`}>
            <Car aria-hidden="true" size={17} />
            Practicar
          </Link>
        </nav>
      </header>

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
    </main>
  );
}
