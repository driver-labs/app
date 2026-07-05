import { getRagEnv } from "@/lib/rag/env";
import { createEmbedding, createGroundedAnswer } from "@/lib/rag/openai";
import { matchNormativeChunks, type NormativeChunk } from "@/lib/rag/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AskRequest = {
  matchCount?: number;
  matchThreshold?: number;
  question?: string;
};

const INSUFFICIENT_EVIDENCE_ANSWER =
  "No tengo evidencia suficiente en los documentos recuperados para responder eso.";

function citationLabel(chunk: NormativeChunk, index: number) {
  const article = chunk.article_number
    ? `Art. ${chunk.article_number}`
    : "sin artículo";
  return `[${index + 1}] ${chunk.document_name}, ${article}`;
}

function buildContext(chunks: NormativeChunk[]) {
  return chunks
    .map((chunk, index) => {
      const pages =
        chunk.page_start && chunk.page_end
          ? `, páginas ${chunk.page_start}-${chunk.page_end}`
          : "";
      return [
        `${citationLabel(chunk, index)}${pages}`,
        chunk.section_title ? `Sección: ${chunk.section_title}` : null,
        `Texto: ${chunk.content.slice(0, 2400)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

function getReferencedCitationIndexes(answer: string, chunkCount: number) {
  const references: number[] = [];
  const seenReferences = new Set<number>();

  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const citationNumber = Number(match[1]);
    const chunkIndex = citationNumber - 1;

    if (
      Number.isInteger(chunkIndex) &&
      chunkIndex >= 0 &&
      chunkIndex < chunkCount
    ) {
      if (!seenReferences.has(chunkIndex)) {
        references.push(chunkIndex);
        seenReferences.add(chunkIndex);
      }
    }
  }

  return references;
}

function renumberAnswerCitations(answer: string, indexes: number[]) {
  const citationMap = new Map(
    indexes.map((chunkIndex, citationIndex) => [
      chunkIndex + 1,
      citationIndex + 1,
    ]),
  );

  return answer.replace(/\[(\d+)\]/g, (match, citationNumber: string) => {
    const normalizedCitation = citationMap.get(Number(citationNumber));
    return normalizedCitation ? `[${normalizedCitation}]` : match;
  });
}

function buildCitations(chunks: NormativeChunk[], indexes: number[]) {
  return indexes.map((index, citationIndex) => {
    const chunk = chunks[index];

    return {
      articleNumber: chunk.article_number,
      chunkIndex: chunk.chunk_index,
      documentKey: chunk.document_key,
      documentName: chunk.document_name,
      excerpt: chunk.content.slice(0, 520),
      id: chunk.id,
      label: citationLabel(chunk, citationIndex),
      pageEnd: chunk.page_end,
      pageStart: chunk.page_start,
      sectionTitle: chunk.section_title,
      similarity: chunk.similarity,
      sourcePath: chunk.source_path,
      sourceUrl: chunk.source_url,
    };
  });
}

function evidenceFallback() {
  return Response.json({
    answer: INSUFFICIENT_EVIDENCE_ANSWER,
    citations: [],
    evidence: false,
  });
}

export async function POST(request: Request) {
  const { env, missing } = getRagEnv();

  if (!env) {
    return Response.json(
      {
        answer: "La configuración RAG del servidor está incompleta.",
        citations: [],
        evidence: false,
        missing,
      },
      { status: 503 },
    );
  }

  let body: AskRequest;

  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const question = body.question?.trim();

  if (!question || question.length < 4) {
    return Response.json(
      { error: "La pregunta es requerida." },
      { status: 400 },
    );
  }

  if (question.length > 1200) {
    return Response.json(
      { error: "La pregunta debe tener 1200 caracteres o menos." },
      { status: 400 },
    );
  }

  const embedding = await createEmbedding({
    apiKey: env.openaiApiKey,
    input: question,
    model: env.openaiEmbeddingModel,
  });

  const chunks = await matchNormativeChunks({
    embedding,
    matchCount: body.matchCount ?? env.ragMatchCount,
    matchThreshold: body.matchThreshold ?? env.ragMatchThreshold,
    supabaseKey: env.supabaseKey,
    supabaseUrl: env.supabaseUrl,
  });

  if (chunks.length === 0) {
    return evidenceFallback();
  }

  const answer = await createGroundedAnswer({
    apiKey: env.openaiApiKey,
    context: buildContext(chunks),
    model: env.openaiChatModel,
    question,
  });
  const referencedCitationIndexes = getReferencedCitationIndexes(
    answer,
    chunks.length,
  );
  const citations =
    answer === INSUFFICIENT_EVIDENCE_ANSWER
      ? []
      : buildCitations(chunks, referencedCitationIndexes);
  const answerWithNormalizedCitations =
    citations.length > 0
      ? renumberAnswerCitations(answer, referencedCitationIndexes)
      : answer;

  return Response.json({
    answer: answerWithNormalizedCitations,
    citations,
    evidence: citations.length > 0,
  });
}
