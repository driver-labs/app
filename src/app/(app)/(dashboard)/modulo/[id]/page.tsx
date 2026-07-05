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
import { notFound } from "next/navigation";
import { ModuleAudioPlayer } from "@/components/ModuleAudioPlayer";
import {
  type DidacticModuleContent,
  getLearningModule,
  getLearningModuleIds,
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
      <section className="rounded-2xl bg-blue-50 p-5">
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
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
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
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 leading-7 text-slate-700"
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
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
          <HeartPulse aria-hidden="true" className="text-rose-600" size={24} />
          Por que importa
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-700">
          {content.whyItMatters}
        </p>
      </section>

      {legalFoundation.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Scale aria-hidden="true" className="text-blue-700" size={24} />
            Base normativa
          </h2>
          <div className="mt-5 grid gap-4">
            {legalFoundation.map((item, index) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5"
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
        <h2 className="text-2xl font-bold text-slate-950">Lecciones</h2>
        <div className="mt-5 grid gap-4">
          {lessons.map((lesson, index) => (
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
              {lesson.normativeDetail ? (
                <div className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-950">
                  <p className="text-sm font-bold">Que protege la norma</p>
                  <p className="mt-2 leading-7">{lesson.normativeDetail}</p>
                </div>
              ) : null}
              {lesson.everydayExample ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-4 text-slate-700">
                  <p className="text-sm font-bold text-slate-950">
                    Ejemplo cotidiano
                  </p>
                  <p className="mt-2 leading-7">{lesson.everydayExample}</p>
                </div>
              ) : null}
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
              {lesson.watchFor ? (
                <div className="mt-3 rounded-xl bg-amber-50 p-4 text-amber-950">
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
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Route aria-hidden="true" className="text-blue-700" size={24} />
            Casos aplicados
          </h2>
          <div className="mt-5 grid gap-4">
            {applicationCases.map((item, index) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                key={`${item.title}-${index}`}
              >
                <h3 className="text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 leading-8 text-slate-700">
                  {item.situation}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-rose-100 p-4 text-rose-950">
                    <p className="text-sm font-bold">Movimiento riesgoso</p>
                    <p className="mt-2 leading-7">{item.wrongMove}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-4 text-emerald-950">
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
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
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
                className="rounded-2xl border border-slate-200 bg-white p-5"
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
        <section className="rounded-2xl bg-emerald-50 p-5">
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
                className="rounded-xl bg-white p-4 text-slate-700"
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
          {quiz.map((item, index) => (
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

      {vocabulary.length ? (
        <section>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-950">
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
                className="rounded-2xl border border-slate-200 bg-white p-5"
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

      <section className="rounded-2xl bg-slate-100 p-5">
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
  const moduleAudio = getModuleAudio(module.id);

  return (
    <section className="module-layout">
      <article className="module-content">
        <div className="module-hero">
          <p className="eyebrow">
            <BookOpen aria-hidden="true" size={14} />
            Modulo {module.id.slice(0, 2)}
          </p>
          <h1>{module.title}</h1>
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
            Falta preparar el contenido didactico para este modulo.
          </p>
        )}
      </article>
    </section>
  );
}
