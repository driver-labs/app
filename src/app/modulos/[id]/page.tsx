import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLearningModule,
  getLearningModuleIds,
  getLearningModules,
  type MarkdownBlock,
} from "@/lib/content/modules";

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

const manualAssetUrl = "/api/assets/manual-senales";

export function generateStaticParams() {
  return getLearningModuleIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getLearningModule(id);

  return {
    description: module?.summary,
    title: module ? `${module.title} | DriverLab` : "Modulo | DriverLab",
  };
}

function MarkdownContent({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="grid gap-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level === 2 ? "h2" : "h3";
          return (
            <Heading
              className={
                block.level === 2
                  ? "mt-5 text-2xl font-bold text-slate-950"
                  : "mt-3 text-xl font-semibold text-slate-900"
              }
              key={`${block.type}-${block.text}-${index}`}
            >
              {block.text}
            </Heading>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p
              className="max-w-3xl text-base leading-8 text-slate-700"
              key={`${block.type}-${index}`}
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              className="grid gap-2 text-base leading-7 text-slate-700"
              key={`${block.type}-${index}`}
            >
              {block.items.map((item) => (
                <li className="flex gap-3" key={item}>
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-emerald-600"
                    size={17}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div
            className="overflow-x-auto rounded-2xl border border-slate-200"
            key={`${block.type}-${index}`}
          >
            <table className="w-full min-w-[680px] border-collapse bg-white text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {block.headers.map((header) => (
                    <th className="px-4 py-3 font-semibold" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {block.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell) => (
                      <td
                        className="px-4 py-3 leading-6 text-slate-700"
                        key={cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getLearningModule(id);
  if (!module) notFound();

  const modules = getLearningModules();
  const moduleIndex = modules.findIndex((item) => item.id === module.id);
  const previousModule = moduleIndex > 0 ? modules[moduleIndex - 1] : null;
  const nextModule =
    moduleIndex >= 0 && moduleIndex < modules.length - 1
      ? modules[moduleIndex + 1]
      : null;
  const hasManualScope = module.sourceScope.some((source) =>
    source.toLowerCase().includes("manual"),
  );

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0d1321]">
      <section className="border-b border-slate-200 bg-white px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            href="/modulos"
          >
            <ArrowRight aria-hidden="true" className="rotate-180" size={16} />
            Todos los modulos
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                <BookOpen aria-hidden="true" size={16} />
                Modulo {module.id.slice(0, 2)}
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
                {module.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {module.summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {module.tags.map((tag) => (
                  <span
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Clock3
                    aria-hidden="true"
                    className="text-blue-700"
                    size={18}
                  />
                  <span>{module.estimatedMinutes} minutos estimados</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileCheck2
                    aria-hidden="true"
                    className="text-blue-700"
                    size={18}
                  />
                  <span>Prioridad {module.priority}</span>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
                  Contenido estructurado para RAG: debe citar las fuentes antes
                  de convertirse en leccion final o pregunta de examen.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,.08)] sm:p-8">
            <MarkdownContent blocks={module.blocks} />
          </article>

          <aside className="grid content-start gap-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                <FileText aria-hidden="true" size={15} />
                Fuentes esperadas
              </p>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                {module.sourceScope.map((source) => (
                  <li className="rounded-xl bg-slate-50 p-3" key={source}>
                    {source}
                  </li>
                ))}
              </ul>
              {hasManualScope ? (
                <Link
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                  href={manualAssetUrl}
                  target="_blank"
                >
                  Abrir manual de senales
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Navegacion
              </p>
              <div className="mt-4 grid gap-3">
                {previousModule ? (
                  <Link
                    className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    href={`/modulos/${previousModule.id}`}
                  >
                    Anterior: {previousModule.title}
                  </Link>
                ) : null}
                {nextModule ? (
                  <Link
                    className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    href={`/modulos/${nextModule.id}`}
                  >
                    Siguiente: {nextModule.title}
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
