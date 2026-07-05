import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileQuestion,
  HeartPulse,
  ListChecks,
  Route,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleAudioPlayer } from "@/components/ModuleAudioPlayer";
import {
  type DidacticModuleContent,
  getLearningModule,
  getLearningModuleIds,
  getLearningModules,
} from "@/lib/content/modules";

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

const audioManifestPath = path.join(
  process.cwd(),
  "public",
  "audio",
  "modules",
  "manifest.json",
);

type ModuleAudioManifest = {
  modules: Record<
    string,
    {
      segments: Array<{ label: string; src: string }>;
      title: string;
    }
  >;
};

function getModuleAudio(moduleId: string) {
  if (!existsSync(audioManifestPath)) return null;

  try {
    const manifest = JSON.parse(
      readFileSync(audioManifestPath, "utf8"),
    ) as ModuleAudioManifest;
    return manifest.modules[moduleId] ?? null;
  } catch {
    return null;
  }
}

function CitationRefs({
  citations,
  numbers,
}: {
  citations: DidacticModuleContent["citations"];
  numbers: number[];
}) {
  if (!numbers.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {numbers.map((number) => {
        const citation = citations[number - 1];
        if (!citation) return null;

        return (
          <span
            className="module-citation-badge rounded-full px-3 py-1 text-xs font-bold"
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
  const applicationCases = content.applicationCases ?? [];
  const checklist = content.checklist ?? [];
  const commonMistakes = content.commonMistakes ?? [];
  const learningObjectives = content.learningObjectives ?? [];
  const legalFoundation = content.legalFoundation ?? [];
  const lessons = content.lessons ?? [];
  const quiz = content.quiz ?? [];
  const reflection = content.reflection ?? [];
  const vocabulary = content.vocabulary ?? [];

  return (
    <div className="grid gap-8">
      <section className="module-dark-card rounded-2xl p-5">
        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
          <BrainCircuit aria-hidden="true" size={15} />
          Idea central
        </p>
        <p className="mt-3 text-xl font-semibold leading-8 text-slate-950">
          {content.coreIdea}
        </p>
      </section>

      {learningObjectives.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
            <ListChecks
              aria-hidden="true"
              className="text-blue-700"
              size={24}
            />
            Objetivos de aprendizaje
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {learningObjectives.map((objective) => (
              <li
                className="module-dark-card module-dark-card--compact flex gap-3 rounded-xl p-4 leading-7"
                key={objective}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-emerald-600"
                  size={17}
                />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <HeartPulse aria-hidden="true" className="text-rose-600" size={24} />
          Por que importa
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-white">
          {content.whyItMatters}
        </p>
      </section>

      {legalFoundation.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
            <Scale aria-hidden="true" className="text-blue-700" size={24} />
            Base normativa
          </h2>
          <div className="mt-5 grid gap-4">
            {legalFoundation.map((item, index) => (
              <article
                className="module-dark-card rounded-2xl p-5"
                key={`${item.title}-${index}`}
              >
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  Fundamento {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 leading-8 text-slate-700">
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
      ) : null}

      <section>
        <h2 className="text-2xl font-bold text-white">Lecciones</h2>
        <div className="mt-5 grid gap-4">
          {lessons.map((lesson, index) => (
            <article
              className="module-dark-card rounded-2xl p-5"
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
              {lesson.normativeDetail ? (
                <div className="module-dark-inset module-dark-inset--info mt-4 rounded-xl p-4">
                  <p className="text-sm font-bold">Que protege la norma</p>
                  <p className="mt-2 leading-7">{lesson.normativeDetail}</p>
                </div>
              ) : null}
              {lesson.everydayExample ? (
                <div className="module-dark-inset mt-3 rounded-xl p-4">
                  <p className="text-sm font-bold text-slate-950">
                    Ejemplo cotidiano
                  </p>
                  <p className="mt-2 leading-7">{lesson.everydayExample}</p>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="module-dark-inset module-dark-inset--success rounded-xl p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Decision segura
                  </p>
                  <p className="mt-2 leading-7">{lesson.streetDecision}</p>
                </div>
                <div className="module-dark-inset module-dark-inset--danger rounded-xl p-4">
                  <p className="text-sm font-bold">Riesgo que evita</p>
                  <p className="mt-2 leading-7">{lesson.risk}</p>
                </div>
              </div>
              {lesson.watchFor ? (
                <div className="module-dark-inset module-dark-inset--warning mt-3 rounded-xl p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle aria-hidden="true" size={16} />
                    Observa esto en la via
                  </p>
                  <p className="mt-2 leading-7">{lesson.watchFor}</p>
                </div>
              ) : null}
              <CitationRefs
                citations={content.citations}
                numbers={lesson.citationNumbers}
              />
            </article>
          ))}
        </div>
      </section>

      {applicationCases.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
            <Route aria-hidden="true" className="text-blue-700" size={24} />
            Casos aplicados
          </h2>
          <div className="mt-5 grid gap-4">
            {applicationCases.map((item, index) => (
              <article
                className="module-dark-card rounded-2xl p-5"
                key={`${item.title}-${index}`}
              >
                <h3 className="text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 leading-8 text-slate-700">
                  {item.situation}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="module-dark-inset module-dark-inset--danger rounded-xl p-4">
                    <p className="text-sm font-bold">Movimiento riesgoso</p>
                    <p className="mt-2 leading-7">{item.wrongMove}</p>
                  </div>
                  <div className="module-dark-inset module-dark-inset--success rounded-xl p-4">
                    <p className="text-sm font-bold">Movimiento seguro</p>
                    <p className="mt-2 leading-7">{item.safeMove}</p>
                  </div>
                </div>
                <p className="mt-4 leading-8 text-slate-700">{item.why}</p>
                <CitationRefs
                  citations={content.citations}
                  numbers={item.citationNumbers}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {commonMistakes.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
            <AlertTriangle
              aria-hidden="true"
              className="text-amber-600"
              size={24}
            />
            Errores comunes
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {commonMistakes.map((item, index) => (
              <article
                className="module-dark-card rounded-2xl p-5"
                key={`${item.mistake}-${index}`}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {item.mistake}
                </h3>
                <p className="mt-3 leading-7 text-rose-900">
                  {item.consequence}
                </p>
                <p className="mt-3 leading-7 text-slate-700">
                  {item.betterHabit}
                </p>
                <CitationRefs
                  citations={content.citations}
                  numbers={item.citationNumbers}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {checklist.length ? (
        <section className="module-dark-card rounded-2xl p-5">
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
            <ListChecks
              aria-hidden="true"
              className="text-emerald-700"
              size={24}
            />
            Checklist de conduccion consciente
          </h2>
          <ul className="mt-5 grid gap-4">
            {checklist.map((item, index) => (
              <li
                className="module-dark-inset rounded-xl p-4"
                key={`${item.label}-${index}`}
              >
                <p className="font-semibold text-slate-950">{item.label}</p>
                <p className="mt-2 leading-7">{item.action}</p>
                <CitationRefs
                  citations={content.citations}
                  numbers={item.citationNumbers}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.scenario ? (
        <section className="module-dark-card rounded-2xl p-5">
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
            <div className="module-dark-inset module-dark-inset--danger rounded-xl p-4">
              <p className="text-sm font-bold">Decision riesgosa</p>
              <p className="mt-2 leading-7">{content.scenario.unsafeChoice}</p>
            </div>
            <div className="module-dark-inset module-dark-inset--success rounded-xl p-4">
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
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <FileQuestion
            aria-hidden="true"
            className="text-blue-700"
            size={24}
          />
          Practica
        </h2>
        <div className="mt-5 grid gap-4">
          {quiz.map((item, index) => (
            <article
              className="module-dark-card rounded-2xl p-5"
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
                        ? "module-answer module-answer--correct rounded-xl px-4 py-3"
                        : "module-answer rounded-xl px-4 py-3"
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

      {vocabulary.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
            <BookMarked
              aria-hidden="true"
              className="text-blue-700"
              size={24}
            />
            Vocabulario clave
          </h2>
          <dl className="mt-5 grid gap-4 md:grid-cols-2">
            {vocabulary.map((item, index) => (
              <div
                className="module-dark-card rounded-2xl p-5"
                key={`${item.term}-${index}`}
              >
                <dt className="text-lg font-semibold text-slate-950">
                  {item.term}
                </dt>
                <dd className="mt-2 leading-7 text-slate-700">
                  {item.meaning}
                </dd>
                <CitationRefs
                  citations={content.citations}
                  numbers={item.citationNumbers}
                />
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="module-dark-card rounded-2xl p-5">
        <h2 className="text-2xl font-bold text-slate-950">
          Preguntas para pensar antes de manejar
        </h2>
        <ul className="mt-4 grid gap-3 text-slate-700">
          {reflection.map((question) => (
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

export default async function ModulePage({ params }: ModulePageProps) {
  const { id } = await params;
  const module = getLearningModule(id);
  if (!module) notFound();

  const didacticContent = module.didacticContent;
  const modules = getLearningModules();
  const moduleAudio = getModuleAudio(module.id);

  return (
    <section className="module-layout">
      <nav className="module-course-nav" aria-label="Modulos del curso">
        <div className="module-course-nav__heading">
          <p className="eyebrow">
            <BookOpen aria-hidden="true" size={14} />
            Curso
          </p>
          <h2>Cultura vial</h2>
        </div>
        <ol className="module-course-nav__list">
          {modules.map((item) => {
            const isActive = item.id === module.id;

            return (
              <li key={item.id}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  href={`/modulo/${item.id}`}
                >
                  <span className="module-course-nav__number">
                    {item.id.slice(0, 2)}
                  </span>
                  <span className="module-course-nav__copy">
                    <span>{item.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <article className="module-content">
        <div className="module-hero">
          <p className="eyebrow">
            <BookOpen aria-hidden="true" size={14} />
            Modulo {module.id.slice(0, 2)}
          </p>
          <h1>{didacticContent?.headline ?? module.title}</h1>
          {moduleAudio ? (
            <ModuleAudioPlayer
              moduleTitle={moduleAudio.title}
              segments={moduleAudio.segments}
            />
          ) : null}
          <p className="lede">{didacticContent?.intro ?? module.summary}</p>
          <ul className="module-tags" aria-label="Etiquetas del modulo">
            {module.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </div>
        {didacticContent ? (
          <DidacticContent content={didacticContent} />
        ) : (
          <p className="lede">
            Falta generar el contenido didactico desde RAG para este modulo.
          </p>
        )}
      </article>
    </section>
  );
}
