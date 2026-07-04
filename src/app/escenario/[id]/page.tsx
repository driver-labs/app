import { ArrowRight, Construction } from "lucide-react";
import Link from "next/link";

type ScenarioPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Escenario | DriverLab",
};

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-10 text-[#0d1321]">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,.08)]">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          <Construction aria-hidden="true" size={16} />
          Escenario reservado
        </p>
        <h1 className="mt-4 text-4xl font-bold">Escenario {id}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Esta fase valida primero la base documental y los modulos RAG. Los
          escenarios interactivos se conectaran despues, cuando las lecciones y
          citas esten curadas.
        </p>
        <Link
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          href="/modulos"
        >
          Ver modulos
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    </main>
  );
}
