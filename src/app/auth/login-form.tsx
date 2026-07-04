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
  "h-12 rounded-input border bg-background px-4 text-base text-text outline-none transition placeholder:text-disabled focus:ring-3";

function getInputClassName(hasError: boolean) {
  return `${inputClassName} ${
    hasError
      ? "border-danger focus:border-danger focus:ring-danger/15"
      : "border-divider focus:border-primary focus:ring-primary/15"
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

  function setMode(nextMode: AuthFormValues["intent"]) {
    setServerState(initialState);
    setValue("intent", nextMode, {
      shouldDirty: true,
      shouldValidate: false,
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
      <div className="grid grid-cols-2 rounded-button border border-divider bg-background p-1">
        <button
          aria-pressed={!isSignUp}
          className={`h-10 rounded-input px-3 text-sm font-semibold transition ${
            !isSignUp
              ? "bg-primary text-white shadow-[0_12px_30px_rgba(37,99,235,.18)]"
              : "text-secondary-text hover:text-text"
          }`}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Entrar
        </button>
        <button
          aria-pressed={isSignUp}
          className={`h-10 rounded-input px-3 text-sm font-semibold transition ${
            isSignUp
              ? "bg-primary text-white shadow-[0_12px_30px_rgba(37,99,235,.18)]"
              : "text-secondary-text hover:text-text"
          }`}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      <input type="hidden" {...register("intent")} />

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-secondary-text"
          htmlFor="email"
        >
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
          <p className="text-sm font-medium text-danger" id="email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-secondary-text"
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
          <p className="text-sm font-medium text-danger" id="password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {isSignUp ? (
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-secondary-text"
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
              className="text-sm font-medium text-danger"
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
          className="rounded-input border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          {serverState.message}
        </p>
      ) : null}

      <button
        className="h-12 rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled"
        disabled={isPending}
        type="submit"
      >
        {isSignUp ? "Crear cuenta" : "Entrar"}
      </button>
    </form>
  );
}
