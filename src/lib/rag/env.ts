export type RagEnv = {
  openaiApiKey: string;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  ragMatchCount: number;
  ragMatchThreshold: number;
  supabaseKey: string;
  supabaseUrl: string;
};

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_MATCH_COUNT = 6;
const DEFAULT_MATCH_THRESHOLD = 0.5;

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getRagEnv(): { env: RagEnv | null; missing: string[] } {
  const openaiApiKey = firstDefined(
    process.env.OPENAI_API_KEY,
    process.env.OpenAI_key,
  );
  const supabaseUrl = firstDefined(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseKey = firstDefined(
    process.env.SUPABASE_RAG_READ_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  const missing = [
    { name: "OPENAI_API_KEY", value: openaiApiKey },
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: supabaseUrl },
    { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: supabaseKey },
  ]
    .filter(({ value }) => !value)
    .map(({ name }) => name);

  if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
    return { env: null, missing };
  }

  return {
    env: {
      openaiApiKey,
      openaiChatModel:
        firstDefined(process.env.OPENAI_CHAT_MODEL) ?? DEFAULT_CHAT_MODEL,
      openaiEmbeddingModel:
        firstDefined(process.env.OPENAI_EMBEDDING_MODEL) ??
        DEFAULT_EMBEDDING_MODEL,
      ragMatchCount: readNumber(
        process.env.RAG_MATCH_COUNT,
        DEFAULT_MATCH_COUNT,
      ),
      ragMatchThreshold: readNumber(
        process.env.RAG_MATCH_THRESHOLD,
        DEFAULT_MATCH_THRESHOLD,
      ),
      supabaseKey,
      supabaseUrl,
    },
    missing: [],
  };
}
