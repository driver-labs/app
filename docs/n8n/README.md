# Flujo n8n: noticias de El Salvador → escenarios DriverLab

Un workflow de n8n cloud corre **todos los días a las 6:00 (America/El_Salvador)**, lee noticias de tránsito de El Salvador (Google News RSS + elsalvador.com), las analiza con OpenAI y genera **≥10 escenarios jugables** que inserta en la tabla `news_scenarios` de Supabase. La app los muestra en `/news` y los reproduce en `/news/<id>`.

## Archivos

| Archivo | Qué es |
|---|---|
| `news-scenarios-workflow.json` | Workflow importable (generado — **no editar a mano**) |
| `generation-contract.json` | Contrato de generación (patterns, assets, módulos, enums, límites) derivado de las plantillas reales |
| `.credentials.json` | Cache de ids de credenciales creadas vía API (no contiene secretos) |

## Regenerar / publicar

```bash
# 1. Sembrar plantillas en Supabase y regenerar el contrato
npx tsx --env-file=.env scripts/seed-scenario-templates.mjs

# 2. Regenerar el workflow JSON desde el contrato
node --env-file=.env scripts/build-n8n-workflow.mjs

# 3. Publicar en n8n cloud, activar y disparar una corrida de prueba
node --env-file=.env scripts/push-n8n-workflow.mjs        # con corrida de prueba
node --env-file=.env scripts/push-n8n-workflow.mjs --no-run

# 4. Validar lo insertado contra el schema real de la app
npx tsx --env-file=.env scripts/validate-news-scenarios.mjs
```

Variables requeridas en `.env`: `N8N_INSTANCE_URL`, `N8N_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Credenciales en n8n

El workflow referencia dos credenciales por id (`openAiApi` y `supabaseApi`). `push-n8n-workflow.mjs` las resuelve solo: usa las existentes si la API las lista, o crea `DriverLab OpenAI (api)` y `DriverLab Supabase (api)` con los valores del `.env`. El JSON del repo nunca contiene secretos.

## Disparo manual

Además del cron diario, el workflow expone un webhook para correrlo a demanda (usado por el script de push):

```bash
curl -X POST "$N8N_INSTANCE_URL/webhook/driverlab-news-run"
```

## Cómo funciona (21 nodos)

1. **Triggers**: cron `0 6 * * *` + webhook manual.
2. **4 feeds RSS** (Google News `es-419`/SV ×3 + elsalvador.com), con `continueOnFail` — un feed caído no rompe la corrida. No se siguen los links de Google News (muros de consentimiento): título + descripción bastan y el contrato permite inventar detalles plausibles.
3. **Normalize Stories**: limpia HTML, quita >48 h, deduplica por URL/título, tope 25.
4. **Fetch Seen URLs / Fetch Templates**: lee `news_scenarios.news_url` (dedupe entre corridas) y las 12 plantillas de `scenario_templates`.
5. **OpenAI Triage** (`gpt-4.1-mini`): por noticia decide `relevant`, `score`, `pattern` (13 posibles) y `mode` (`overlay` | `new_simulation`). Se descartan no-viales.
6. **OpenAI Generate** (`gpt-4.1`): genera el overlay pedagógico (título, descripción, quiz, feedback…) y, si `mode=new_simulation`, también una simulación nueva dentro del contrato (solo assetIds del catálogo, roles/tags cerrados, límites numéricos).
7. **Build & Validate** (validador sin dependencias, ~400 líneas): arma el `ScenarioDefinition` final. Campos que **nunca** vienen del LLM: `id`, `slug`, `lessonIds`, `scoring`, `schemaVersion`, timestamps, URLs de assets. Cadena de fallback: `new_simulation` inválida → overlay de plantilla → descarte.
8. **Enough Scenarios?**: si hay <10, **OpenAI Top-Up** genera variaciones de los temas del día hasta llegar a 12.
9. **Insert Scenarios**: POST PostgREST a `news_scenarios?on_conflict=id` con `Prefer: resolution=ignore-duplicates`.

La app aplica una segunda validación al leer (`src/lib/scenarios/news.ts`): Zod + referencias cruzadas + `toPlayableScenario()`; una fila corrupta se ignora en silencio y nunca rompe la app.
