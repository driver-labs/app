"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { type AuthState, authenticate } from "@/app/auth/actions";
import {
  type AuthFormValues,
  authSchema,
  type ValidAuthFormValues,
} from "@/app/auth/schema";

const initialState: AuthState = {
  fieldErrors: {},
  message: "",
};

const inputClassName =
  "h-11 rounded-md border bg-white px-3 text-base text-slate-950 outline-none transition focus:ring-3";

function getInputClassName(hasError: boolean) {
  return `${inputClassName} ${
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-100"
      : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
  }`;
}

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [serverState, setServerState] = useState<AuthState>(initialState);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
  } = useForm<AuthFormValues>({
    defaultValues: {
      email: "",
      intent: "sign-in",
      password: "",
      passwordConfirmation: "",
    },
    resolver: zodResolver(authSchema),
  });
  const mode = watch("intent");
  const isSignUp = mode === "sign-up";
  const pending = isPending;

  function setMode(nextMode: AuthFormValues["intent"]) {
    setValue("intent", nextMode, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function onSubmit(values: ValidAuthFormValues) {
    setServerState(initialState);
    startTransition(async () => {
      const result = await authenticate(values);

      if (result.fieldErrors.email) {
        setError("email", { message: result.fieldErrors.email });
      }

      if (result.fieldErrors.password) {
        setError("password", { message: result.fieldErrors.password });
      }

      if (result.fieldErrors.passwordConfirmation) {
        setError("passwordConfirmation", {
          message: result.fieldErrors.passwordConfirmation,
        });
      }

      setServerState(result);
    });
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-1">
        <button
          aria-pressed={!isSignUp}
          className={`h-10 rounded-sm px-3 text-sm font-semibold transition ${
            !isSignUp
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Entrar
        </button>
        <button
          aria-pressed={isSignUp}
          className={`h-10 rounded-sm px-3 text-sm font-semibold transition ${
            isSignUp
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      <input type="hidden" {...register("intent")} />

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Correo
        </label>
        <input
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          className={getInputClassName(Boolean(errors.email))}
          id="email"
          placeholder="tu@correo.com"
          type="email"
          {...register("email")}
        />
        {errors.email?.message ? (
          <p className="text-sm font-medium text-red-600" id="email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Contraseña
        </label>
        <input
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          className={getInputClassName(Boolean(errors.password))}
          id="password"
          placeholder="••••••••"
          type="password"
          {...register("password")}
        />
        {errors.password?.message ? (
          <p className="text-sm font-medium text-red-600" id="password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {isSignUp ? (
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="passwordConfirmation"
          >
            Confirmar contraseña
          </label>
          <input
            aria-describedby={
              errors.passwordConfirmation
                ? "passwordConfirmation-error"
                : undefined
            }
            aria-invalid={Boolean(errors.passwordConfirmation)}
            className={getInputClassName(Boolean(errors.passwordConfirmation))}
            id="passwordConfirmation"
            placeholder="••••••••"
            type="password"
            {...register("passwordConfirmation")}
          />
          {errors.passwordConfirmation?.message ? (
            <p
              className="text-sm font-medium text-red-600"
              id="passwordConfirmation-error"
            >
              {errors.passwordConfirmation.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {serverState.message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {serverState.message}
        </p>
      ) : null}

      <button
        className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={pending}
        type="submit"
      >
        {isSignUp ? "Crear cuenta" : "Entrar"}
      </button>
    </form>
  );
}
