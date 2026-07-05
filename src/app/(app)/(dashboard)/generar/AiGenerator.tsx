import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AiGenerator() {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-[#0d1321] shadow-[0_14px_40px_rgba(15,23,42,.08)]">
      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
        <Sparkles aria-hidden="true" size={16} />
        Generador reservado
      </p>
      <h1 className="mt-4 text-4xl font-bold">
        Primero validamos el contenido de aprendizaje.
      </h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">
        La generación de escenas y quizzes queda fuera de esta fase. El flujo
        activo prepara la normativa y los módulos para que la experiencia sea
        clara antes de sumar más automatización.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          href="/modulos"
        >
          Ver módulos
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          href="/ruta"
        >
          Ver ruta
        </Link>
      </div>
    </section>
  );
}
