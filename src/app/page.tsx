import { signOut } from "@/app/auth/actions";
import { LoginForm } from "@/app/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Driver Labs
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Acceso seguro con Supabase Auth.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            Inicia sesión o crea una cuenta con correo y contraseña. La sesión
            se mantiene con cookies SSR para que el servidor pueda reconocer al
            usuario en cada request.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {userEmail ? (
            <div className="grid gap-5">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Sesión activa
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {userEmail}
                </h2>
              </div>
              <form action={signOut}>
                <button
                  className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          ) : (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Entra a tu cuenta
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Usa las credenciales configuradas en tu proyecto de Supabase.
                </p>
              </div>
              <LoginForm />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
