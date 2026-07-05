import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Gauge,
  type LucideIcon,
  Map as MapIcon,
  Newspaper,
  PlayCircle,
  Sparkles,
  TrafficCone,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPrimaryScenarioForModule } from "@/core/scenarios";
import { getLearningModules } from "@/lib/content/modules";
import { createClient } from "@/lib/supabase/server";
import LandingHeroScene from "./LandingHeroScene";

const methodCards: Array<{
  icon: LucideIcon;
  title: string;
  text: string;
}> = [
  {
    icon: BookOpenCheck,
    title: "Normativa digerible",
    text: "Ley, reglamentos y señales convertidos en decisiones concretas para la calle.",
  },
  {
    icon: TrafficCone,
    title: "Escenarios con riesgo real",
    text: "Cruces, peatones, lluvia y distracciones aparecen como situaciones visuales, no como texto plano.",
  },
  {
    icon: Gauge,
    title: "Progreso que sirve",
    text: "Cada intento deja evidencia: errores, lecciones practicadas y temas que conviene reforzar.",
  },
];

const routeCards = [
  "Primera licencia",
  "Refuerzo para conductores",
  "Práctica de examen",
  "Conducción defensiva",
];

async function getUserEmail() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!hasSupabaseConfig) return null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return typeof data?.claims?.email === "string" ? data.claims.email : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const modules = getLearningModules();
  const featuredModules = modules.slice(0, 4);
  const firstScenario =
    modules
      .map((module) => getPrimaryScenarioForModule(module.id))
      .find((scenario) => Boolean(scenario)) ?? null;
  const userEmail = await getUserEmail();
  const primaryHref = userEmail ? "/roadmap" : "/login";
  const primaryLabel = userEmail ? "Continuar ruta" : "Empezar ahora";
  const demoHref = firstScenario
    ? `/practicar/${firstScenario.id}`
    : "/practicar";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate min-h-[88dvh] overflow-hidden bg-[#06111f] text-white">
        <div className="pointer-events-none absolute inset-0">
          <LandingHeroScene />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,13,28,0.98)_0%,rgba(4,13,28,0.78)_46%,rgba(4,13,28,0.24)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(180deg,rgba(4,13,28,0)_0%,hsl(var(--background))_100%)]" />

        <nav className="relative z-20 mx-auto flex w-[var(--shell-width)] items-center justify-between gap-3 py-5">
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-1 no-underline"
            href="/"
            aria-label="DriverLab, inicio"
          >
            <Image
              alt="DriverLab"
              className="h-auto w-36"
              height={626}
              priority
              src="/brand/driver-lab-logo.svg"
              width={1324}
            />
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/8 p-1 text-sm font-semibold text-white/78 backdrop-blur-md md:flex">
            <a
              className="inline-flex min-h-10 items-center rounded-full px-4 transition hover:bg-white/10 hover:text-white"
              href="#metodo"
            >
              Método
            </a>
            <a
              className="inline-flex min-h-10 items-center rounded-full px-4 transition hover:bg-white/10 hover:text-white"
              href="#rutas"
            >
              Rutas
            </a>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 transition hover:bg-white/10 hover:text-white"
              href="/news"
            >
              <Newspaper aria-hidden="true" size={16} />
              Blog vial
            </Link>
          </div>

          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 text-sm font-semibold text-white no-underline backdrop-blur-md transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-secondary/60 sm:px-4"
            href={primaryHref}
            aria-label={
              userEmail ? "Abrir tu ruta de aprendizaje" : "Iniciar sesión"
            }
            title={userEmail ? "Abrir tu ruta" : "Iniciar sesión"}
          >
            <UserRound aria-hidden="true" size={18} />
            <span className="hidden sm:inline">
              {userEmail ? "Mi ruta" : "Cuenta"}
            </span>
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[calc(88dvh-5.5rem)] w-[var(--shell-width)] items-center pb-20 pt-10">
          <div className="max-w-4xl">
            <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-secondary/35 bg-secondary/14 px-4 text-sm font-semibold text-secondary backdrop-blur-md">
              <Sparkles aria-hidden="true" size={16} />
              Cultura vial moderna para El Salvador
            </div>
            <h1 className="mt-7 text-6xl font-black leading-none text-white md:text-8xl lg:text-9xl">
              DriverLab
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
              Aprendé la ley, entendé el riesgo y practicá decisiones de manejo
              en escenarios 3D antes de salir a la calle.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-6 text-sm font-bold text-secondary-foreground no-underline shadow-[0_24px_80px_rgba(16,185,129,0.28)] transition hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-secondary/60"
                href={primaryHref}
              >
                {primaryLabel}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/10 px-6 text-sm font-bold text-white no-underline backdrop-blur-md transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/40"
                href={demoHref}
              >
                <PlayCircle aria-hidden="true" size={18} />
                Probar escena 3D
              </Link>
            </div>

            <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["12", "módulos"],
                ["3D", "práctica"],
                ["RAG", "citas"],
              ].map(([value, label]) => (
                <div
                  className="rounded-lg border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-md"
                  key={label}
                >
                  <dt className="text-sm font-semibold text-white/62">
                    {label}
                  </dt>
                  <dd className="mt-1 text-2xl font-black text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-20" id="metodo">
        <div className="mx-auto w-[var(--shell-width)]">
          <div className="max-w-3xl">
            <p className="eyebrow text-secondary">Método DriverLab</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-foreground md:text-6xl">
              Menos memoria. Más criterio.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              La experiencia combina contenido normativo, práctica visual y
              retroalimentación concreta. El objetivo no es solo pasar un
              examen: es tomar mejores decisiones bajo presión.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {methodCards.map(({ icon: Icon, text, title }) => (
              <article
                className="rounded-lg border border-border bg-card p-5 shadow-xs"
                key={title}
              >
                <div className="flex size-11 items-center justify-center rounded-lg bg-secondary/12 text-secondary">
                  <Icon aria-hidden="true" size={22} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card/45 px-4 py-20" id="rutas">
        <div className="mx-auto grid w-[var(--shell-width)] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="eyebrow text-secondary">Rutas de aprendizaje</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-foreground md:text-5xl">
              Una ruta para aprender, practicar y reforzar.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              DriverLab ordena los módulos por objetivo: licencia, refuerzo,
              simulacro y conducción defensiva. La práctica no queda separada de
              la teoría.
            </p>
            <div className="mt-7 grid gap-2">
              {routeCards.map((route) => (
                <div
                  className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground"
                  key={route}
                >
                  <MapIcon
                    aria-hidden="true"
                    className="text-secondary"
                    size={18}
                  />
                  {route}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {featuredModules.map((module, index) => (
              <Link
                className="group rounded-lg border border-border bg-background p-5 text-foreground no-underline transition hover:-translate-y-0.5 hover:border-secondary/45 hover:shadow-lg"
                href={`/modulo/${module.id}`}
                key={module.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-secondary opacity-70 transition group-hover:opacity-100"
                    size={19}
                  />
                </div>
                <h3 className="mt-6 text-lg font-bold leading-snug">
                  {module.didacticContent?.headline ?? module.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {module.summary}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-20">
        <div className="mx-auto grid w-[var(--shell-width)] gap-8 rounded-lg border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="eyebrow text-secondary">Blog vial y noticias</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-foreground md:text-5xl">
              Casos reales convertidos en práctica.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Las noticias de tránsito también alimentan escenarios. El blog
              mantiene contexto actual y sirve como puente entre lo que pasa en
              la calle y lo que se practica en DriverLab.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground no-underline transition hover:bg-primary/90"
            href="/news"
          >
            <Newspaper aria-hidden="true" size={18} />
            Ir al blog vial
          </Link>
        </div>
      </section>

      <section className="bg-[#06111f] px-4 py-14 text-white">
        <div className="mx-auto flex w-[var(--shell-width)] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-secondary">DriverLab</p>
            <p className="mt-2 max-w-xl text-2xl font-black leading-tight">
              La educación vial tiene que sentirse tan seria como manejar.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-6 text-sm font-bold text-secondary-foreground no-underline transition hover:bg-secondary/90"
            href={primaryHref}
          >
            {primaryLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
