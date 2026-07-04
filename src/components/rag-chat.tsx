"use client";

import { type FormEvent, useState } from "react";

type Citation = {
  articleNumber: string | null;
  documentName: string;
  excerpt: string;
  id: string;
  label: string;
  pageEnd: number | null;
  pageStart: number | null;
  sectionTitle: string | null;
  similarity: number;
  sourcePath: string | null;
  sourceUrl: string | null;
};

type AskResponse = {
  answer: string;
  citations: Citation[];
  evidence: boolean;
  missing?: string[];
};

type Message = {
  answer: string;
  citations: Citation[];
  evidence: boolean;
  question: string;
};

export function RagChat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        body: JSON.stringify({ question: trimmedQuestion }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const payload = (await response.json()) as
        | AskResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload ? payload.error : "No se pudo responder.",
        );
      }

      const result = payload as AskResponse;
      setMessages((current) => [
        {
          answer: result.answer,
          citations: result.citations,
          evidence: result.evidence,
          question: trimmedQuestion,
        },
        ...current,
      ]);
      setQuestion("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Error inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#1f2933]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col border-b border-[#d5d1c3] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f6f52]">
              DriverLab
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#172018] sm:text-3xl">
              RAG normativo vial
            </h1>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-medium text-[#334155] sm:mt-0">
            <span className="border border-[#d5d1c3] bg-white px-3 py-2">
              Ley
            </span>
            <span className="border border-[#d5d1c3] bg-white px-3 py-2">
              Reglamento
            </span>
            <span className="border border-[#d5d1c3] bg-white px-3 py-2">
              DL 185
            </span>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            className="flex min-h-[420px] flex-col border border-[#d5d1c3] bg-white"
            onSubmit={handleSubmit}
          >
            <label
              className="border-b border-[#d5d1c3] px-4 py-3 text-sm font-semibold text-[#243124]"
              htmlFor="rag-question"
            >
              Pregunta
            </label>
            <textarea
              className="min-h-72 flex-1 resize-none px-4 py-4 text-base leading-7 outline-none placeholder:text-[#7b8794]"
              id="rag-question"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej. ¿Qué documentos debe entregar un conductor cuando la autoridad lo requiere?"
              value={question}
            />
            {error ? (
              <p className="border-t border-[#f0b8a6] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b2c2c]">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-between border-t border-[#d5d1c3] px-4 py-3">
              <span className="text-xs text-[#667085]">
                {question.length}/1200
              </span>
              <button
                className="h-10 bg-[#1f4f46] px-5 text-sm font-semibold text-white transition hover:bg-[#183f38] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                disabled={isLoading || question.trim().length < 4}
                type="submit"
              >
                {isLoading ? "Consultando" : "Enviar"}
              </button>
            </div>
          </form>

          <div className="flex min-h-[420px] flex-col border border-[#d5d1c3] bg-white">
            <div className="border-b border-[#d5d1c3] px-4 py-3 text-sm font-semibold text-[#243124]">
              Respuestas
            </div>
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#667085]">
                  Sin consultas todavía.
                </div>
              ) : (
                <div className="divide-y divide-[#e3e0d4]">
                  {messages.map((message) => (
                    <article
                      className="px-4 py-4"
                      key={`${message.question}-${message.answer}`}
                    >
                      <p className="text-sm font-semibold text-[#475467]">
                        {message.question}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[#101828]">
                        {message.answer}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={
                            message.evidence
                              ? "border border-[#a7c7b3] bg-[#eef8f0] px-2 py-1 text-xs font-semibold text-[#22543d]"
                              : "border border-[#f0b8a6] bg-[#fff3ef] px-2 py-1 text-xs font-semibold text-[#9b2c2c]"
                          }
                        >
                          {message.evidence
                            ? "Con evidencia"
                            : "Sin evidencia suficiente"}
                        </span>
                      </div>
                      {message.citations.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6f52]">
                            Citas usadas
                          </h2>
                          {message.citations.map((citation) => (
                            <section
                              className="border border-[#d5d1c3] bg-[#fbfbf8] px-3 py-3"
                              key={citation.id}
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-sm font-semibold text-[#1f2933]">
                                  {citation.label}
                                </h2>
                                <span className="text-xs text-[#667085]">
                                  {(citation.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                              {citation.sectionTitle ? (
                                <p className="mt-1 text-xs font-medium text-[#5f6f52]">
                                  {citation.sectionTitle}
                                </p>
                              ) : null}
                              <p className="mt-2 line-clamp-4 text-sm leading-6 text-[#475467]">
                                {citation.excerpt}
                              </p>
                              <p className="mt-2 text-xs text-[#667085]">
                                {citation.pageStart && citation.pageEnd
                                  ? `Páginas ${citation.pageStart}-${citation.pageEnd}`
                                  : citation.sourcePath}
                              </p>
                            </section>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
