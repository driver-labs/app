import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const modulesDir = path.join(
  projectRoot,
  "content",
  "knowledge-base",
  "modules",
);
const outputDir = path.join(projectRoot, "content", "generated-modules");

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_MATCH_COUNT = 8;
const DEFAULT_MATCH_THRESHOLD = 0.24;
const MAX_EVIDENCE_CHUNKS = 18;

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const [key, ...valueParts] = line.split("=");
    const value = valueParts
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key.trim()]) process.env[key.trim()] = value;
  }
}

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.trim());
}

function getEnv() {
  loadDotEnv(path.join(projectRoot, ".env.local"));
  loadDotEnv(path.join(projectRoot, ".env"));

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
    ["OPENAI_API_KEY", openaiApiKey],
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", supabaseKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    openaiApiKey,
    openaiChatModel:
      firstDefined(process.env.OPENAI_CHAT_MODEL) ?? DEFAULT_CHAT_MODEL,
    openaiEmbeddingModel:
      firstDefined(process.env.OPENAI_EMBEDDING_MODEL) ??
      DEFAULT_EMBEDDING_MODEL,
    supabaseKey,
    supabaseUrl,
  };
}

function stripQuotes(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseInlineArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map(stripQuotes)
      .filter(Boolean);
  }
}

function parseFrontMatter(rawFrontMatter) {
  const data = {};
  let activeListKey = null;

  for (const line of rawFrontMatter.split("\n")) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && activeListKey) {
      data[activeListKey] = [
        ...(Array.isArray(data[activeListKey]) ? data[activeListKey] : []),
        stripQuotes(listItem[1]),
      ];
      continue;
    }

    const field = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!field) continue;

    const [, key, rawValue] = field;
    const value = rawValue.trim();
    activeListKey = null;

    if (!value) {
      data[key] = [];
      activeListKey = key;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = parseInlineArray(value);
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = stripQuotes(value);
    }
  }

  return data;
}

function splitFrontMatter(file) {
  const normalized = file.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n"))
    return { body: normalized, frontMatter: {} };

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { body: normalized, frontMatter: {} };

  return {
    body: normalized.slice(end + 5).trim(),
    frontMatter: parseFrontMatter(normalized.slice(4, end)),
  };
}

function section(body, heading) {
  const start = body.indexOf(`## ${heading}`);
  if (start === -1) return "";

  const rest = body.slice(start).split("\n").slice(1).join("\n");
  const nextHeading = rest.search(/\n## /);
  return (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
}

function cleanSectionText(value) {
  return value
    .replace(/\|/g, " | ")
    .replace(/\n+/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-| ]+$/.test(line))
    .join("\n");
}

function readModules() {
  return readdirSync(modulesDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort()
    .map((fileName) => {
      const file = readFileSync(path.join(modulesDir, fileName), "utf8");
      const { body, frontMatter } = splitFrontMatter(file);

      return {
        audience: Array.isArray(frontMatter.audience)
          ? frontMatter.audience
          : [],
        concepts: cleanSectionText(
          section(body, "Conceptos que debe recuperar la RAG"),
        ),
        estimatedMinutes:
          typeof frontMatter.estimated_minutes === "number"
            ? frontMatter.estimated_minutes
            : 10,
        id:
          typeof frontMatter.module_id === "string"
            ? frontMatter.module_id
            : fileName.replace(/\.md$/, ""),
        microLessons: cleanSectionText(
          section(body, "Micro-lecciones sugeridas"),
        ),
        purpose: cleanSectionText(section(body, "Proposito")),
        questions: cleanSectionText(section(body, "Preguntas a generar")),
        scenarios: cleanSectionText(section(body, "Escenarios sugeridos")),
        sourceScope: Array.isArray(frontMatter.source_scope)
          ? frontMatter.source_scope
          : [],
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
        title:
          typeof frontMatter.title === "string"
            ? frontMatter.title
            : fileName.replace(/\.md$/, ""),
        visual: cleanSectionText(section(body, "Visual sugerido")),
      };
    });
}

async function parseOpenAiResponse(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenAI request failed: ${response.status}`,
    );
  }
  return payload;
}

async function createEmbedding({ apiKey, input, model }) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, model }),
  });
  const payload = await parseOpenAiResponse(response);
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) throw new Error("OpenAI did not return an embedding.");
  return embedding;
}

async function matchChunks({ embedding, env }) {
  const response = await fetch(
    `${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/match_normative_chunks`,
    {
      method: "POST",
      headers: {
        apikey: env.supabaseKey,
        Authorization: `Bearer ${env.supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_count: DEFAULT_MATCH_COUNT,
        match_threshold: DEFAULT_MATCH_THRESHOLD,
        query_embedding: embedding,
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload.message ?? `Supabase request failed: ${response.status}`,
    );
  }
  return payload;
}

function citationLabel(chunk, index) {
  const article = chunk.article_number
    ? `Art. ${chunk.article_number}`
    : "unidad normativa";
  return `[${index + 1}] ${chunk.document_name}, ${article}`;
}

function buildContext(chunks) {
  return chunks
    .map((chunk, index) => {
      const pages =
        chunk.page_start && chunk.page_end
          ? `, paginas ${chunk.page_start}-${chunk.page_end}`
          : "";
      return [
        `${citationLabel(chunk, index)}${pages}`,
        chunk.section_title ? `Seccion: ${chunk.section_title}` : null,
        `Texto: ${chunk.content.slice(0, 2200)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

function buildRetrievalQueries(module) {
  return [
    [
      `Modulo: ${module.title}`,
      `Proposito: ${module.purpose}`,
      `Fuentes esperadas: ${module.sourceScope.join(", ")}`,
    ].join("\n"),
    [
      `Cobertura normativa para ${module.title}`,
      module.concepts,
      module.microLessons,
    ].join("\n"),
    [
      `Aplicacion practica para conductores: ${module.title}`,
      module.scenarios,
      module.questions,
    ].join("\n"),
    [
      `Senales, obligaciones, prohibiciones, sanciones, excepciones y decisiones seguras relacionadas con ${module.title}`,
      module.visual,
      module.sourceScope.join(", "),
    ].join("\n"),
  ].filter((query) => query.replace(/\s+/g, "").length > 0);
}

async function retrieveEvidence({ env, queries }) {
  const byId = new Map();

  for (const query of queries) {
    const embedding = await createEmbedding({
      apiKey: env.openaiApiKey,
      input: query,
      model: env.openaiEmbeddingModel,
    });
    const chunks = await matchChunks({ embedding, env });

    for (const chunk of chunks) {
      const existing = byId.get(chunk.id);
      if (!existing || Number(chunk.similarity) > Number(existing.similarity)) {
        byId.set(chunk.id, chunk);
      }
    }
  }

  return [...byId.values()]
    .sort((left, right) => Number(right.similarity) - Number(left.similarity))
    .slice(0, MAX_EVIDENCE_CHUNKS);
}

function normalizeCitationNumbers(value, max) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= max),
    ),
  ];
}

function normalizeGeneratedContent(content, chunks) {
  const candidate =
    content.module ??
    content.didacticModule ??
    content.learningModule ??
    content.content ??
    content.generatedContent ??
    content;
  const maxCitation = chunks.length;
  const normalizeItem = (item) => ({
    ...item,
    citationNumbers: normalizeCitationNumbers(
      item?.citationNumbers,
      maxCitation,
    ),
  });
  const normalizeItems = (value) =>
    Array.isArray(value) ? value.map(normalizeItem) : [];
  const normalizeTextArray = (value) =>
    Array.isArray(value) ? value.map(String).filter(Boolean) : [];

  return {
    coreIdea: String(candidate.coreIdea ?? ""),
    headline: String(candidate.headline ?? ""),
    intro: String(candidate.intro ?? ""),
    applicationCases: normalizeItems(candidate.applicationCases),
    checklist: normalizeItems(candidate.checklist),
    commonMistakes: normalizeItems(candidate.commonMistakes),
    estimatedMinutes: Number(candidate.estimatedMinutes) || null,
    learningObjectives: normalizeTextArray(candidate.learningObjectives),
    legalFoundation: normalizeItems(candidate.legalFoundation),
    lessons: normalizeItems(candidate.lessons),
    needsHumanReview: normalizeTextArray(candidate.needsHumanReview),
    quiz: normalizeItems(candidate.quiz),
    reflection: normalizeTextArray(candidate.reflection),
    scenario: candidate.scenario ? normalizeItem(candidate.scenario) : null,
    vocabulary: normalizeItems(candidate.vocabulary),
    whyItMatters: String(candidate.whyItMatters ?? ""),
  };
}

function wordCount(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function qualityIssues(content) {
  const issues = [];
  const minimums = [
    ["learningObjectives", content.learningObjectives, 4],
    ["legalFoundation", content.legalFoundation, 4],
    ["lessons", content.lessons, 6],
    ["applicationCases", content.applicationCases, 2],
    ["commonMistakes", content.commonMistakes, 4],
    ["checklist", content.checklist, 6],
    ["quiz", content.quiz, 5],
    ["vocabulary", content.vocabulary, 4],
    ["reflection", content.reflection, 4],
  ];

  for (const [name, value, min] of minimums) {
    const count = Array.isArray(value) ? value.length : 0;
    if (count < min) issues.push(`${name} tiene ${count}; minimo ${min}.`);
  }

  const instructionalBody = {
    applicationCases: content.applicationCases,
    checklist: content.checklist,
    commonMistakes: content.commonMistakes,
    coreIdea: content.coreIdea,
    intro: content.intro,
    learningObjectives: content.learningObjectives,
    legalFoundation: content.legalFoundation,
    lessons: content.lessons,
    quiz: content.quiz,
    reflection: content.reflection,
    scenario: content.scenario,
    vocabulary: content.vocabulary,
    whyItMatters: content.whyItMatters,
  };
  const instructionalWords = wordCount(JSON.stringify(instructionalBody));
  if (instructionalWords < 1400) {
    issues.push(
      `contenido didactico tiene ${instructionalWords} palabras; minimo 1400.`,
    );
  }

  if (wordCount(content.intro) < 80) {
    issues.push("intro tiene menos de 80 palabras.");
  }

  if (wordCount(content.whyItMatters) < 80) {
    issues.push("whyItMatters tiene menos de 80 palabras.");
  }

  return issues;
}

async function createDidacticModule({
  chunks,
  env,
  module,
  qualityFeedback,
  retrievalQuery,
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiChatModel,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 7000,
      messages: [
        {
          role: "system",
          content: [
            "Eres un disenador instruccional de cultura vial para El Salvador.",
            "Tu tarea es convertir evidencia normativa recuperada por RAG en contenido didactico para aprender con conciencia.",
            "No copies el brief del modulo. Usalo solo como intencion pedagogica.",
            "Usa lenguaje claro, humano, completo y accionable.",
            "Cada modulo debe sentirse como una clase de calidad: explicar, contextualizar, dar ejemplos y entrenar decisiones reales.",
            "No inventes montos, articulos, obligaciones ni requisitos.",
            "Cada leccion, escenario o pregunta debe incluir citationNumbers con los numeros de evidencia usados.",
            "Si la evidencia no alcanza para una afirmacion, ponlo en needsHumanReview.",
            "Devuelve solo JSON valido.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            "Genera un objeto JSON raiz con EXACTAMENTE estas claves:",
            "headline, intro, estimatedMinutes, learningObjectives, coreIdea, whyItMatters, legalFoundation, lessons, applicationCases, commonMistakes, checklist, scenario, quiz, vocabulary, reflection, needsHumanReview.",
            "intro debe tener 90 a 130 palabras.",
            "estimatedMinutes debe reflejar la extension real del modulo, normalmente entre 25 y 40.",
            "learningObjectives debe tener 4 a 6 objetivos concretos.",
            "coreIdea debe tener 45 a 70 palabras.",
            "whyItMatters debe tener 100 a 160 palabras y conectar la norma con vidas reales.",
            "legalFoundation debe tener 4 a 7 elementos con: title, explanation, citationNumbers. explanation debe explicar la base normativa en 60 a 100 palabras.",
            "lessons debe tener de 6 a 8 elementos con: title, explanation, normativeDetail, everydayExample, streetDecision, risk, watchFor, citationNumbers.",
            "En cada lesson: explanation explica el concepto en 45 a 70 palabras; normativeDetail explica que exige o protege la norma en 45 a 80 palabras; everydayExample aterriza el concepto en un caso cotidiano de 35 a 60 palabras.",
            "No uses campos de una sola oracion en lessons: explanation debe tener 3 oraciones completas, normativeDetail 2 oraciones completas y everydayExample 2 oraciones completas.",
            "streetDecision y safeDecision deben ser acciones directas en imperativo o recomendacion concreta, no preguntas.",
            "applicationCases debe tener 2 o 3 elementos con: title, situation, wrongMove, safeMove, why, citationNumbers.",
            "commonMistakes debe tener 4 a 6 elementos con: mistake, consequence, betterHabit, citationNumbers.",
            "checklist debe tener 6 a 10 elementos con: label, action, citationNumbers.",
            "scenario debe tener: title, situation, unsafeChoice, safeDecision, feedback, citationNumbers.",
            "quiz debe tener de 5 a 7 elementos con: question, options, answer, explanation, citationNumbers.",
            "vocabulary debe tener 4 a 6 elementos con: term, meaning, citationNumbers.",
            "reflection debe tener de 4 a 6 preguntas cortas.",
            "citationNumbers debe referirse solo a los numeros de evidencia recuperada.",
            "Cubre la mayor cantidad posible de aristas relevantes dentro de la evidencia: reglas, senales, obligaciones, prohibiciones, riesgos, excepciones, sanciones o consecuencias cuando aplique.",
            "No devuelvas Markdown.",
            "",
            `BRIEF DEL MODULO:\n${JSON.stringify(module, null, 2)}`,
            "",
            `CONSULTA DE RECUPERACION:\n${retrievalQuery}`,
            "",
            `EVIDENCIA RECUPERADA:\n${buildContext(chunks)}`,
            qualityFeedback
              ? `\nCONTROL DE CALIDAD DEL INTENTO ANTERIOR:\n${qualityFeedback}\nRegenera el modulo completo corrigiendo todos esos puntos.`
              : "",
          ].join("\n"),
        },
      ],
    }),
  });

  const payload = await parseOpenAiResponse(response);
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw)
    throw new Error(`OpenAI did not generate content for ${module.id}.`);
  return normalizeGeneratedContent(JSON.parse(raw), chunks);
}

async function generateModule(module, env) {
  const retrievalQueries = buildRetrievalQueries(module);
  const retrievalQuery = retrievalQueries.join("\n\n---\n\n");
  const chunks = await retrieveEvidence({
    env,
    queries: retrievalQueries,
  });
  let generated = null;
  let issues = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    generated = await createDidacticModule({
      chunks,
      env,
      module,
      qualityFeedback: issues.join("\n"),
      retrievalQuery,
    });
    issues = qualityIssues(generated);
    if (issues.length === 0) break;
    console.warn(`Quality retry needed for ${module.id}: ${issues.join(" ")}`);
  }

  if (!generated) {
    throw new Error(`No content generated for ${module.id}.`);
  }

  if (issues.length > 0) {
    generated.needsHumanReview = [
      ...new Set([
        ...(generated.needsHumanReview ?? []),
        `Control de calidad pendiente: ${issues.join(" ")}`,
      ]),
    ];
  }

  return {
    ...generated,
    audience: module.audience,
    citations: chunks.map((chunk, index) => ({
      articleNumber: chunk.article_number,
      documentKey: chunk.document_key,
      documentName: chunk.document_name,
      excerpt: chunk.content.slice(0, 520),
      id: chunk.id,
      label: citationLabel(chunk, index),
      pageEnd: chunk.page_end,
      pageStart: chunk.page_start,
      sectionTitle: chunk.section_title,
      similarity: chunk.similarity,
      sourcePath: chunk.source_path,
      sourceUrl: chunk.source_url,
    })),
    generatedAt: new Date().toISOString(),
    generator: "scripts/generate-learning-modules.mjs",
    moduleId: module.id,
    originalBrief: {
      concepts: module.concepts,
      purpose: module.purpose,
      questions: module.questions,
      scenarios: module.scenarios,
      sourceScope: module.sourceScope,
      visual: module.visual,
    },
    retrievalQuery,
    title: module.title,
  };
}

async function main() {
  const env = getEnv();
  const only = process.argv.includes("--only")
    ? process.argv[process.argv.indexOf("--only") + 1]
    : null;
  const modules = readModules().filter((module) => !only || module.id === only);

  if (modules.length === 0) {
    throw new Error(`No modules matched ${only}.`);
  }

  mkdirSync(outputDir, { recursive: true });

  for (const module of modules) {
    console.log(`Generating ${module.id}...`);
    const generated = await generateModule(module, env);
    writeFileSync(
      path.join(outputDir, `${module.id}.json`),
      `${JSON.stringify(generated, null, 2)}\n`,
      "utf8",
    );
    console.log(`Wrote ${module.id}.json`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
