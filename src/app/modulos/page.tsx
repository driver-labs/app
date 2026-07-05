import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  FileSearch,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { getLearningModules } from "@/lib/content/modules";

export const metadata = {
  title: "Modulos | DriverLab",
  description:
    "Modulos de aprendizaje vial estructurados para practicar decisiones seguras.",
};

export default function ModulesIndexPage() {
  const modules = getLearningModules();

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-10 text-[#0d1321]">
      <section className="mx-auto max-w-7xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          href="/"
        >
          <ArrowRight aria-hidden="true" className="rotate-180" size={16} />
          Volver al inicio
        </Link>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              <BookOpenCheck aria-hidden="true" size={16} />
              Aprendizaje vial
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-normal sm:text-5xl">
              Modulos creados desde la documentacion normativa.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Cada modulo conserva su fuente esperada, conceptos que debe
              reforzar, micro-lecciones, escenarios y preguntas para transformar
              normativa en decisiones claras.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <Link
                className="group rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.08)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_42px_rgba(37,99,235,.14)]"
                href={`/modulos/${module.id}`}
                key={module.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                    {module.id.slice(0, 2)}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
                    size={18}
                  />
                </div>
                <h2 className="mt-5 text-xl font-semibold">{module.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {module.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    <Clock3 aria-hidden="true" size={13} />
                    {module.estimatedMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    <FileSearch aria-hidden="true" size={13} />
                    {module.sourceScope.length} fuentes
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    <Tag aria-hidden="true" size={13} />
                    {module.tags[0] ?? "modulo"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
