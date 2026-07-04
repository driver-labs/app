import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileQuestion,
  FileText,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type DidacticModuleContent,
  getLearningModule,
  getLearningModuleIds,
  getLearningModules,
  type MarkdownBlock,
} from "@/lib/content/modules";

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

const manualAssetUrl = "/api/assets/manual-senales";

function CitationRefs({
  citations,
  numbers,
}: {
  citations: DidacticModuleContent["citations"];
  numbers: number[];
}) {
  if (numbers.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {numbers.map((number) => {
        const citation = citations[number - 1];
        if (!citation) return null;

        return (
          <span
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
            key={`${citation.id}-${number}`}
            title={citation.label}
          >
            [{number}] {citation.documentName}
            {citation.articleNumber ? `, Art. ${citation.articleNumber}` : ""}
          </span>
        );
      })}
    </div>
  );
}

function DidacticContent({ content }: { content: DidacticModuleContent }) {
  return (
    <div className="grid gap-8">
      <section className="rounded-2xl bg-blue-50 p-5">
        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          <BrainCircuit aria-hidden="true" size={15} />
          Idea central
        </p>
        <p className="mt-3 text-xl font-semibold leading-8 text-slate-950">
          {content.coreIdea}
        </p>
      </section>

      <section>
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
          <HeartPulse aria-hidden="true" className="text-rose-600" size={24} />
          Por que importa
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-700">
          {content.whyItMatters}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-950">Lecciones</h2>
        <div className="mt-5 grid gap-4">
          {content.lessons.map((lesson, index) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={`${lesson.title}-${index}`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Leccion {index + 1}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {lesson.title}
              </h3>
              <p className="mt-3 leading-8 text-slate-700">
                {lesson.explanation}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 p-4 text-emerald-950">
                  <p className="inline-flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Decision segura
                  </p>
                  <p className="mt-2 leading-7">{lesson.streetDecision}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-4 text-rose-950">
                  <p className="text-sm font-bold">Riesgo que evita</p>
                  <p className="mt-2 leading-7">{lesson.risk}</p>
                </div>
              </div>
              <CitationRefs
                citations={content.citations}
                numbers={lesson.citationNumbers}
              />
            </article>
          ))}
        </div>
      </section>

      {content.scenario ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-2xl font-bold text-slate-950">
            Escenario de conciencia
          </h2>
          <h3 className="mt-4 text-xl font-semibold text-slate-950">
            {content.scenario.title}
          </h3>
          <p className="mt-3 leading-8 text-slate-700">
            {content.scenario.situation}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-rose-100 p-4 text-rose-950">
              <p className="text-sm font-bold">Decision riesgosa</p>
              <p className="mt-2 leading-7">{content.scenario.unsafeChoice}</p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-4 text-emerald-950">
              <p className="text-sm font-bold">Decision segura</p>
              <p className="mt-2 leading-7">{content.scenario.safeDecision}</p>
            </div>
          </div>
          <p className="mt-4 leading-8 text-slate-700">
            {content.scenario.feedback}
          </p>
          <CitationRefs
            citations={content.citations}
            numbers={content.scenario.citationNumbers}
          />
        </section>
      ) : null}

      <section>
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
          <FileQuestion
            aria-hidden="true"
            className="text-blue-700"
            size={24}
          />
          Practica
        </h2>
        <div className="mt-5 grid gap-4">
          {content.quiz.map((item, index) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={`${item.question}-${index}`}
            >
              <h3 className="text-lg font-semibold text-slate-950">
                {item.question}
              </h3>
              <ul className="mt-4 grid gap-2">
                {item.options.map((option) => (
                  <li
                    className={
                      option === item.answer
                        ? "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950"
                        : "rounded-xl border border-slate-200 px-4 py-3 text-slate-700"
                    }
                    key={option}
                  >
                    {option}
                  </li>
                ))}
              </ul>
              <p className="mt-4 leading-8 text-slate-700">
                {item.explanation}
              </p>
              <CitationRefs
                citations={content.citations}
                numbers={item.citationNumbers}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-100 p-5">
        <h2 className="text-2xl font-bold text-slate-950">
          Preguntas para pensar antes de manejar
        </h2>
        <ul className="mt-4 grid gap-3 text-slate-700">
          {content.reflection.map((question) => (
            <li className="flex gap-3 leading-7" key={question}>
              <ShieldCheck
                aria-hidden="true"
                className="mt-1 shrink-0 text-blue-700"
                size={17}
              />
              {question}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

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

  const didacticContent = module.didacticContent;
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
                {didacticContent?.headline ?? module.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {didacticContent?.intro ?? module.summary}
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
                  {didacticContent
                    ? "Contenido didactico generado desde RAG con citas verificables."
                    : "Falta generar el contenido didactico desde RAG para este modulo."}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,.08)] sm:p-8">
            {didacticContent ? (
              <DidacticContent content={didacticContent} />
            ) : (
              <MarkdownContent blocks={module.blocks} />
            )}
          </article>

          <aside className="grid content-start gap-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                <FileText aria-hidden="true" size={15} />
                {didacticContent ? "Citas usadas" : "Fuentes esperadas"}
              </p>
              {didacticContent ? (
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                  {didacticContent.citations.map((citation, index) => (
                    <li
                      className="rounded-xl bg-slate-50 p-3"
                      key={citation.id}
                    >
                      <strong>
                        [{index + 1}] {citation.documentName}
                      </strong>
                      <span className="mt-1 block text-slate-600">
                        {citation.articleNumber
                          ? `Art. ${citation.articleNumber}`
                          : "Unidad normativa"}
                        {citation.pageStart && citation.pageEnd
                          ? `, paginas ${citation.pageStart}-${citation.pageEnd}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                  {module.sourceScope.map((source) => (
                    <li className="rounded-xl bg-slate-50 p-3" key={source}>
                      {source}
                    </li>
                  ))}
                </ul>
              )}
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

            {didacticContent?.needsHumanReview.length ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <p className="text-sm font-bold uppercase tracking-[0.12em]">
                  Requiere revision
                </p>
                <ul className="mt-3 grid gap-2 text-sm leading-6">
                  {didacticContent.needsHumanReview.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

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
