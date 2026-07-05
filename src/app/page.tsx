import { ArrowRight, BookOpenCheck, Car, Map as MapIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getLearningModules } from "@/lib/content/modules";

export default function Home() {
  const modules = getLearningModules().slice(0, 6);

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
        <nav className="flex items-center justify-between gap-4 border-b border-border py-5">
          <Link className="inline-flex items-center" href="/">
            <Image
              alt="DriverLab"
              className="h-auto w-36"
              height={626}
              priority
              src="/brand/driver-lab-logo.svg"
              width={1324}
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden h-10 items-center gap-2 rounded-button border border-border bg-surface px-4 text-sm font-semibold text-secondary-text transition hover:border-primary hover:text-text sm:inline-flex"
              href="/modulos"
            >
              <BookOpenCheck aria-hidden="true" size={16} />
              Módulos
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
              href="/login"
            >
              Entrar
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </nav>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="eyebrow">Cultura vial para El Salvador</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight text-text sm:text-5xl">
              Aprende normativa y practica decisiones de tránsito con contexto.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-secondary-text">
              DriverLab organiza la teoría, los escenarios 3D y el progreso en
              una experiencia de aprendizaje clara, directa y verificable.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                href="/login"
              >
                Continuar aprendizaje
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-border bg-surface px-5 text-sm font-semibold text-text transition hover:border-primary"
                href="/practicar"
              >
                <Car aria-hidden="true" size={16} />
                Ver prácticas
              </Link>
            </div>
          </div>

          <section
            className="rounded-card border border-border bg-surface p-5 shadow-brand"
            aria-label="Accesos rápidos"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-sm font-semibold text-muted">
                  Ruta recomendada
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-text">
                  Roadmap de módulos
                </h2>
              </div>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-button border border-border px-3 text-sm font-semibold text-secondary-text transition hover:border-primary hover:text-text"
                href="/roadmap"
              >
                <MapIcon aria-hidden="true" size={16} />
                Abrir
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {modules.map((module, index) => (
                <Link
                  className="rounded-card border border-border bg-background p-4 transition hover:border-primary"
                  href={`/modulos/${module.id}`}
                  key={module.id}
                >
                  <span className="text-xs font-bold uppercase text-muted">
                    Módulo {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-text">
                    {module.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary-text">
                    {module.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
