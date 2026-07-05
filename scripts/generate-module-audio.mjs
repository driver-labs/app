import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, "content", "generated-modules");
const AUDIO_DIR = path.join(ROOT, "public", "audio", "modules");
const MANIFEST_PATH = path.join(AUDIO_DIR, "manifest.json");
const MAX_INPUT_CHARS = 3800;
const MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const VOICE = process.env.OPENAI_TTS_VOICE ?? "marin";

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  const env = String(readFileSync(envPath));
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function pushParagraph(paragraphs, title, value) {
  const text = cleanText(value);
  if (!text) return;
  paragraphs.push(title ? `${title}. ${text}` : text);
}

function moduleToNarration(module) {
  const paragraphs = [];

  pushParagraph(
    paragraphs,
    `Modulo: ${module.headline ?? module.title}`,
    module.intro,
  );
  pushParagraph(paragraphs, "Idea central", module.coreIdea);
  pushParagraph(paragraphs, "Por que importa", module.whyItMatters);

  if (module.learningObjectives?.length) {
    pushParagraph(
      paragraphs,
      "Objetivos de aprendizaje",
      module.learningObjectives.join(". "),
    );
  }

  for (const lesson of module.lessons ?? []) {
    pushParagraph(paragraphs, `Leccion: ${lesson.title}`, lesson.explanation);
    pushParagraph(paragraphs, "Decision segura", lesson.streetDecision);
    pushParagraph(paragraphs, "Riesgo que evita", lesson.risk);
    pushParagraph(paragraphs, "Ejemplo cotidiano", lesson.everydayExample);
  }

  for (const item of module.applicationCases ?? []) {
    pushParagraph(paragraphs, `Caso aplicado: ${item.title}`, item.situation);
    pushParagraph(paragraphs, "Movimiento seguro", item.safeMove);
    pushParagraph(paragraphs, "Por que", item.why);
  }

  if (module.scenario) {
    pushParagraph(
      paragraphs,
      `Escenario: ${module.scenario.title}`,
      module.scenario.situation,
    );
    pushParagraph(paragraphs, "Decision segura", module.scenario.safeDecision);
    pushParagraph(paragraphs, "Retroalimentacion", module.scenario.feedback);
  }

  if (module.checklist?.length) {
    pushParagraph(
      paragraphs,
      "Checklist de conduccion consciente",
      module.checklist
        .map((item) => `${item.label}: ${item.action}`)
        .join(". "),
    );
  }

  if (module.reflection?.length) {
    pushParagraph(
      paragraphs,
      "Preguntas para pensar antes de manejar",
      module.reflection.join(". "),
    );
  }

  return paragraphs;
}

function splitParagraphs(paragraphs) {
  const parts = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= MAX_INPUT_CHARS) {
      current = next;
      continue;
    }

    if (current) parts.push(current);

    if (paragraph.length <= MAX_INPUT_CHARS) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += MAX_INPUT_CHARS) {
      parts.push(paragraph.slice(index, index + MAX_INPUT_CHARS));
    }
    current = "";
  }

  if (current) parts.push(current);
  return parts;
}

async function readModules() {
  const filenames = (await fs.readdir(MODULES_DIR))
    .filter((filename) => filename.endsWith(".json"))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => {
      const file = await fs.readFile(path.join(MODULES_DIR, filename), "utf8");
      return JSON.parse(file);
    }),
  );
}

async function writeSpeech(input, outputPath) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    body: JSON.stringify({
      input,
      instructions:
        "Narra en espanol latinoamericano claro, amable y educativo. Usa ritmo pausado, tono serio pero cercano, y enfatiza decisiones seguras al conducir.",
      model: MODEL,
      response_format: "mp3",
      voice: VOICE,
    }),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI TTS request failed: ${response.status} ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

loadDotEnv();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment or .env file.");
}

await fs.mkdir(AUDIO_DIR, { recursive: true });

const modules = await readModules();
const manifest = {
  generatedAt: new Date().toISOString(),
  model: MODEL,
  modules: {},
  voice: VOICE,
};

for (const module of modules) {
  const moduleId = module.moduleId;
  const parts = splitParagraphs(moduleToNarration(module));
  const segments = [];

  for (const [index, input] of parts.entries()) {
    const part = String(index + 1).padStart(2, "0");
    const filename = `${moduleId}-part-${part}.mp3`;
    const outputPath = path.join(AUDIO_DIR, filename);

    if (!existsSync(outputPath)) {
      console.log(`Generating ${filename}`);
      await writeSpeech(input, outputPath);
    } else {
      console.log(`Skipping existing ${filename}`);
    }

    segments.push({
      label:
        parts.length > 1
          ? `Parte ${index + 1} de ${parts.length}`
          : "Audio completo",
      src: `/audio/modules/${filename}`,
    });
  }

  manifest.modules[moduleId] = {
    segments,
    title: module.headline ?? module.title,
  };
}

await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Audio manifest written to ${MANIFEST_PATH}`);
