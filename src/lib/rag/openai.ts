type EmbeddingResponse = {
  data?: Array<{ embedding: number[] }>;
  error?: { message?: string };
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

async function parseOpenAiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenAI request failed: ${response.status}`,
    );
  }

  return payload;
}

export async function createEmbedding({
  apiKey,
  input,
  model,
}: {
  apiKey: string;
  input: string;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, model }),
  });

  const payload = await parseOpenAiResponse<EmbeddingResponse>(response);
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("OpenAI did not return an embedding.");
  }

  return embedding;
}

export async function createGroundedAnswer({
  apiKey,
  context,
  model,
  question,
}: {
  apiKey: string;
  context: string;
  model: string;
  question: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente de aprendizaje para normativa vial. " +
            "Responde en español, de forma breve y usando únicamente la evidencia entregada. " +
            "Si la evidencia no basta, responde exactamente: " +
            "'No tengo evidencia suficiente en los documentos disponibles para responder eso.' " +
            "Cuando respondas, incluye marcadores de cita como [1] o [2].",
        },
        {
          role: "user",
          content: `Pregunta:\n${question}\n\nEvidencia recuperada:\n${context}`,
        },
      ],
      model,
      temperature: 0.1,
    }),
  });

  const payload = await parseOpenAiResponse<ChatResponse>(response);
  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("OpenAI did not return an answer.");
  }

  return answer;
}
