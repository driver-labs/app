"use client";

type ScenarioClientProps = {
  title?: string;
};

export default function ScenarioClient({
  title = "Escenario",
}: ScenarioClientProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
      {title} estara disponible cuando se conecte el motor de practica.
    </section>
  );
}
