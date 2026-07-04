import { z } from "zod";

export const authModes = ["sign-in", "sign-up"] as const;

export const authSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Ingresa tu correo.")
      .email("Ingresa un correo válido."),
    intent: z.enum(authModes),
    password: z
      .string()
      .min(1, "Ingresa tu contraseña.")
      .min(6, "Debe tener al menos 6 caracteres."),
    passwordConfirmation: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.intent !== "sign-up") {
      return;
    }

    if (!value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        message: "Confirma tu contraseña.",
        path: ["passwordConfirmation"],
      });

      return;
    }

    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        message: "Las contraseñas no coinciden.",
        path: ["passwordConfirmation"],
      });
    }
  });

export type AuthFormValues = z.input<typeof authSchema>;
export type ValidAuthFormValues = z.output<typeof authSchema>;
