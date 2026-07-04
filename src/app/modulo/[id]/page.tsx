import {
  ArrowRight,
  BookOpen,
  Car,
  CheckCircle2,
  FileText,
  Map as MapIcon,
  PlayCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { KnowledgeModule } from "@/core/knowledge";
import { rulesForModule, scenariosForModule } from "@/core/links";
import {
  getKnowledgeModule,
  getKnowledgeModuleIds,
  knowledgeModules,
} from "@/core/modules";
import { scenarios } from "@/core/scenarios";

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getKnowledgeModuleIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getKnowledgeModule(id);
  return {
    title: module ? `${module.title} | Driver Labs` : "Módulo",
  };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getKnowledgeModule(id);
  if (!module) notFound();

  const relatedScenarios = scenariosForModule(module, scenarios);
  const rules = rulesForModule(module);
  const prerequisites = module.prerequisites
    .map(getKnowledgeModule)
    .filter((item): item is KnowledgeModule => Boolean(item));
  const nextModules = knowledgeModules.filter((item) =>
    item.prerequisites.includes(module.id),
  );

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
          <Link href="/roadmap">
            <MapIcon aria-hidden="true" size={17} />
            Roadmap
          </Link>
          <Link href="/escenario/stop-01">
            <Car aria-hidden="true" size={17} />
            Practicar
          </Link>
        </nav>
      </header>

      <section className="module-layout">
        <article className="module-content">
          <div className="module-hero">
            <p className="eyebrow">
              <BookOpen aria-hidden="true" size={14} />
              Módulo
            </p>
            <h1>{module.title}</h1>
            <p className="lede">{module.summary}</p>
            <ul className="module-tags" aria-label="Infracciones cubiertas">
              {module.ruleKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
          <div className="markdown-copy">
            {module.content.split("\n\n").map((block) => {
              if (block.startsWith("## ")) {
                return <h2 key={block}>{block.slice(3)}</h2>;
              }
              return <p key={block}>{block}</p>;
            })}
          </div>
        </article>

        <aside className="module-sidebar">
          <section>
            <p className="eyebrow">
              <PlayCircle aria-hidden="true" size={14} />
              Escenarios
            </p>
            <div className="link-stack">
              {relatedScenarios.length > 0 ? (
                relatedScenarios.map((scenario) => (
                  <Link key={scenario.id} href={`/escenario/${scenario.id}`}>
                    <PlayCircle aria-hidden="true" size={17} />
                    {scenario.title}
                  </Link>
                ))
              ) : (
                <p className="muted">Aún no hay escenarios quemados.</p>
              )}
            </div>
          </section>

          <section>
            <p className="eyebrow">
              <FileText aria-hidden="true" size={14} />
              Reglas cubiertas
            </p>
            <ul className="detail-list">
              {rules.map((rule) => (
                <li key={rule.key}>
                  <CheckCircle2 aria-hidden="true" size={17} />
                  <strong>{rule.title}</strong>
                  <span>{rule.explanation}</span>
                </li>
              ))}
            </ul>
          </section>

          {prerequisites.length > 0 && (
            <section>
              <p className="eyebrow">Prerequisitos</p>
              <div className="link-stack">
                {prerequisites.map((item) => (
                  <Link key={item.id} href={`/modulo/${item.id}`}>
                    <BookOpen aria-hidden="true" size={17} />
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {nextModules.length > 0 && (
            <section>
              <p className="eyebrow">Siguiente</p>
              <div className="link-stack">
                {nextModules.map((item) => (
                  <Link key={item.id} href={`/modulo/${item.id}`}>
                    <ArrowRight aria-hidden="true" size={17} />
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
