# Prueba RAG Normativa

Esta POC ingiere tres PDFs de `assets`, los divide por artículo o unidad normativa equivalente, genera embeddings con OpenAI y guarda los chunks en Supabase `pgvector`.

## Fuentes

- Ley de Transporte Terrestre, Tránsito y Seguridad Vial.
- Reglamento General de Tránsito y Seguridad Vial.
- Decreto Legislativo No. 185.

## Variables

Copia `.env.example` a `.env.local` y completa las claves reales:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa para la ingesta. No debe exponerse en cliente.

## Base de datos

Aplica la migración:

```bash
supabase db push
```

o ejecuta el SQL de `supabase/migrations/20260704193000_normative_rag.sql` en el SQL editor de Supabase.

## Ingesta

Primero valida extracción y partición:

```bash
npm run rag:dry-run
```

Luego genera embeddings y sube chunks:

```bash
npm run rag:ingest
```

## Consulta

El endpoint recibe:

```http
POST /api/ask
Content-Type: application/json

{ "question": "¿Qué obligación tiene el conductor cuando la autoridad lo requiere?" }
```

La respuesta incluye `answer`, `evidence` y `citations`. Si la similitud no supera el umbral configurado, responde sin inventar evidencia. El umbral inicial recomendado para este corpus es `0.50`.
