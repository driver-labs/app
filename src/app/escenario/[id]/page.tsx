import { Car, Map as MapIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { modulesForScenario } from "@/core/links";
import { knowledgeModules } from "@/core/modules";
import { getScenario, getScenarioIds, scenarios } from "@/core/scenarios";
import { TRAFFIC_RULES } from "@/core/traffic-rules";
import ScenarioClient from "./ScenarioClient";

type ScenarioPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getScenarioIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: ScenarioPageProps) {
  const { id } = await params;
  const scenario = getScenario(id);
  return {
    title: scenario ? `${scenario.title} | Driver Labs` : "Escenario",
  };
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) notFound();

  const relatedModules = modulesForScenario(scenario, knowledgeModules);
  const rule = TRAFFIC_RULES[scenario.event.infractionType];
  const otherScenarios = scenarios.filter((item) => item.id !== scenario.id);

  return (
    <main className="scenario-page">
      <div className="scenario-topbar-wrap">
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
            <Link href="/roadmap">
              <MapIcon aria-hidden="true" size={17} />
              Roadmap
            </Link>
            <Link aria-current="page" href={`/escenario/${scenario.id}`}>
              <Car aria-hidden="true" size={17} />
              Practicar
            </Link>
          </nav>
        </header>
      </div>

      <ScenarioClient
        scenario={scenario}
        relatedModules={relatedModules.map((module) => ({
          id: module.id,
          title: module.title,
        }))}
      />

      <section className="theory-band" aria-labelledby="scenario-theory-title">
        <div className="content-grid">
          <article>
            <p className="eyebrow">Base legal</p>
            <h2 id="scenario-theory-title">{rule.title}</h2>
            <p>{rule.explanation}</p>
            {rule.refs.length > 0 ? (
              <ul className="detail-list">
                {rule.refs.map((ref) => (
                  <li key={`${ref.code}-${ref.summary}`}>
                    <strong>{ref.code}</strong>: {ref.summary}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Esta regla está curada, pero el número de artículo todavía no
                fue confirmado en la fuente oficial.
              </p>
            )}
          </article>

          <aside className="link-stack" aria-label="Navegación relacionada">
            <div>
              <p className="eyebrow">Módulos</p>
              {relatedModules.map((module) => (
                <Link key={module.id} href={`/modulo/${module.id}`}>
                  {module.title}
                </Link>
              ))}
            </div>

            {otherScenarios.length > 0 && (
              <div>
                <p className="eyebrow">Otros escenarios</p>
                {otherScenarios.map((item) => (
                  <Link key={item.id} href={`/escenario/${item.id}`}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
