import { ArrowLeft, CheckCircle2, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LoginForm } from "@/app/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  let userEmail: null | string = null;

  if (hasSupabaseConfig) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userEmail =
      typeof data?.claims?.email === "string" ? data.claims.email : null;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-5 py-6 text-text">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <nav className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center rounded-button bg-white/95 px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,.25)]"
            href="/"
          >
            <Image
              alt="DriverLab"
              className="h-auto w-36"
              height={337}
              priority
              src="/brand/driverlab-logo.png"
              width={741}
            />
          </Link>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-button border border-divider px-4 text-sm font-semibold text-secondary-text transition hover:border-secondary hover:text-text"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Volver
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_430px]">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
              <ShieldCheck aria-hidden="true" size={16} />
              Acceso seguro
            </div>
            <h1 className="mt-7 text-4xl font-bold leading-tight sm:text-6xl">
              Tu ruta de cultura vial empieza aqui.
            </h1>
            <p className="mt-5 text-lg leading-8 text-secondary-text">
              Entra para continuar tus lecciones, practicar escenarios y
              reforzar los temas que mas cuestan antes de salir a la calle.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-secondary-text sm:grid-cols-3">
              {["Ley clara", "Practica guiada", "Progreso visible"].map(
                (item) => (
                  <div
                    className="flex items-center gap-2 rounded-button border border-border bg-surface px-3 py-3"
                    key={item}
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-accent"
                      size={17}
                    />
                    {item}
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-brand">
            {userEmail ? (
              <div className="grid gap-6">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Sesion activa
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-semibold">
                    {userEmail}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-secondary-text">
                    Ya puedes volver a tu experiencia de aprendizaje.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    href="/"
                  >
                    Ir al inicio
                  </Link>
                  <form action={signOut} className="flex-1">
                    <button
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button border border-divider px-4 text-sm font-semibold text-secondary-text transition hover:border-danger hover:text-text"
                      type="submit"
                    >
                      <LogOut aria-hidden="true" size={17} />
                      Cerrar sesion
                    </button>
                  </form>
                </div>
              </div>
            ) : hasSupabaseConfig ? (
              <div className="grid gap-6">
                <div>
                  <h2 className="text-2xl font-semibold">Entra a DriverLab</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary-text">
                    Usa tu correo y contrasena para guardar tu avance.
                  </p>
                </div>
                <LoginForm />
              </div>
            ) : (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Configura Supabase para entrar
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-secondary-text">
                    La identidad visual ya esta lista. Para probar acceso,
                    agrega las variables publicas de Supabase en tu archivo de
                    entorno.
                  </p>
                </div>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  href="/"
                >
                  Ver landing
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
