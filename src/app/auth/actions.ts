"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthFormValues } from "@/app/auth/schema";
import { authSchema } from "@/app/auth/schema";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  fieldErrors: {
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  };
  message: string;
};

function formatAuthError(errorMessage: string) {
  const normalizedMessage = errorMessage.toLowerCase();

  if (
    normalizedMessage.includes("signup") ||
    normalizedMessage.includes("signups")
  ) {
    return "El registro no está habilitado en Supabase.";
  }

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("user already")
  ) {
    return "Ese correo ya tiene una cuenta.";
  }

  if (
    normalizedMessage.includes("invalid login") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "Correo o contraseña incorrectos.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Debes confirmar tu cuenta desde el correo antes de entrar.";
  }

  if (normalizedMessage.includes("password")) {
    return "La contraseña no cumple con los requisitos.";
  }

  if (normalizedMessage.includes("email")) {
    return "Revisa el correo ingresado.";
  }

  return "No pudimos completar la solicitud. Inténtalo de nuevo.";
}

function toFieldErrors(
  errors: ReturnType<typeof authSchema.safeParse>["error"],
) {
  const fieldErrors: AuthState["fieldErrors"] = {};

  for (const issue of errors?.issues ?? []) {
    const field = issue.path[0];

    if (
      field === "email" ||
      field === "password" ||
      field === "passwordConfirmation"
    ) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

export async function authenticate(values: AuthFormValues): Promise<AuthState> {
  const result = authSchema.safeParse(values);

  if (!result.success) {
    return { fieldErrors: toFieldErrors(result.error), message: "" };
  }

  const { email, intent, password } = result.data;
  const supabase = await createClient();
  const credentials = {
    email,
    password,
  };

  if (intent === "sign-up") {
    const { data, error } = await supabase.auth.signUp(credentials);

    if (error) {
      return { fieldErrors: {}, message: formatAuthError(error.message) };
    }

    if (!data.session) {
      return {
        fieldErrors: {},
        message:
          "Cuenta creada. Debes confirmar tu cuenta desde el correo antes de entrar.",
      };
    }
  }

  if (intent === "sign-in") {
    const { error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      return { fieldErrors: {}, message: formatAuthError(error.message) };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
