export type NormativeChunk = {
  article_number: string | null;
  chunk_index: number;
  content: string;
  document_key: string;
  document_name: string;
  id: string;
  metadata: Record<string, unknown>;
  page_end: number | null;
  page_start: number | null;
  section_title: string | null;
  similarity: number;
  source_path: string | null;
  source_url: string | null;
  text_original: string;
};

type SupabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

export async function matchNormativeChunks({
  embedding,
  matchCount,
  matchThreshold,
  supabaseKey,
  supabaseUrl,
}: {
  embedding: number[];
  matchCount: number;
  matchThreshold: number;
  supabaseKey: string;
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/match_normative_chunks`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_count: matchCount,
        match_threshold: matchThreshold,
        query_embedding: embedding,
      }),
    },
  );

  const payload = (await response.json()) as NormativeChunk[] | SupabaseError;

  if (!response.ok) {
    const error = payload as SupabaseError;
    throw new Error(
      error.message ?? `Supabase request failed: ${response.status}`,
    );
  }

  return payload as NormativeChunk[];
}
