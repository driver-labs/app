"use client";

import { FileText, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Scenario } from "@/core/scenario-schema";
import ScenarioPlayer from "@/engine/ScenarioPlayer";

export default function AiGenerator() {
  const [news, setNews] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!news.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "No se pudo generar el escenario.";
        throw new Error(message);
      }

      setScenario(data as Scenario);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  };

  if (scenario) {
    return <ScenarioPlayer scenario={scenario} />;
  }

  return (
    <section className="generator-panel">
      <div>
        <p className="eyebrow">
          <Sparkles aria-hidden="true" size={14} />
          Generador
        </p>
        <h1>Crear escenario desde una noticia</h1>
        <p>
          La noticia se envía a una route handler de Next. La key queda en el
          servidor y la respuesta vuelve como un <code>Scenario</code> validado.
        </p>
      </div>

      <label className="field-group" htmlFor="news-text">
        <span>
          <FileText aria-hidden="true" size={17} />
          Noticia de tránsito
        </span>
        <textarea
          aria-describedby="news-helper"
          className="ai-news"
          disabled={loading}
          id="news-text"
          onChange={(event) => setNews(event.target.value)}
          placeholder="Pegá el texto completo de la noticia..."
          rows={10}
          value={news}
        />
        <small id="news-helper">
          Incluí hechos observables: señalización, clima, maniobra y resultado.
        </small>
      </label>

      <button
        className="primary-action"
        type="button"
        disabled={loading || !news.trim()}
        onClick={generate}
      >
        {loading ? (
          <>
            <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
            Generando
          </>
        ) : (
          <>
            <Sparkles aria-hidden="true" size={18} />
            Generar escenario
          </>
        )}
      </button>

      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
