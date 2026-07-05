import { ArrowLeft, LogOut } from "lucide-react";
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
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-text">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <nav className="flex items-center justify-between gap-4 border-b border-border pb-5">
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
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-button border border-border bg-surface px-4 text-sm font-semibold text-secondary-text transition hover:border-primary hover:text-text"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Volver
          </Link>
        </nav>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-brand">
            {userEmail ? (
              <div className="grid gap-6">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Sesión activa
                  </p>
                  <h1 className="mt-2 break-words text-2xl font-semibold">
                    {userEmail}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-secondary-text">
                    Ya puedes continuar tu roadmap o cerrar sesión para entrar
                    con otra cuenta.
                  </p>
                </div>
                <div className="grid gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    href="/roadmap"
                  >
                    Ir al roadmap
                  </Link>
                  <form action={signOut}>
                    <button
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-border px-4 text-sm font-semibold text-secondary-text transition hover:border-danger hover:text-text"
                      type="submit"
                    >
                      <LogOut aria-hidden="true" size={16} />
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </div>
            ) : hasSupabaseConfig ? (
              <div className="grid gap-6">
                <div>
                  <p className="text-sm font-medium text-muted">DriverLab</p>
                  <h1 className="mt-2 text-2xl font-semibold">
                    Entra a tu cuenta
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-secondary-text">
                    Guarda tu avance, sincroniza intentos y continúa tus
                    prácticas.
                  </p>
                </div>
                <LoginForm />
              </div>
            ) : (
              <div className="grid gap-5">
                <div>
                  <h1 className="text-2xl font-semibold">
                    Configura Supabase para entrar
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-secondary-text">
                    Agrega las variables públicas de Supabase en el entorno para
                    habilitar autenticación.
                  </p>
                </div>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  href="/"
                >
                  Volver al inicio
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
