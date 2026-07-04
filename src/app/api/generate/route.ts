import { generateScenario } from "@/core/generate-scenario";

type GenerateBody = {
  news?: unknown;
};

export async function POST(request: Request) {
  let body: GenerateBody;

  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (typeof body.news !== "string" || body.news.trim().length < 40) {
    return Response.json(
      { error: "Enviá una noticia de tránsito con suficiente contexto." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Falta OPENROUTER_API_KEY en el entorno del servidor." },
      { status: 503 },
    );
  }

  try {
    const scenario = await generateScenario(body.news, {
      apiKey,
      model: process.env.OPENROUTER_MODEL,
      siteUrl: request.headers.get("origin") ?? undefined,
    });
    return Response.json(scenario);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el escenario.",
      },
      { status: 502 },
    );
  }
}
