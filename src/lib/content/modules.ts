import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MODULES_DIR = path.join(
  process.cwd(),
  "content",
  "knowledge-base",
  "modules",
);
const GENERATED_MODULES_DIR = path.join(
  process.cwd(),
  "content",
  "generated-modules",
);

export type MarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string }
  | { headers: string[]; rows: string[][]; type: "table" };

export type LearningModule = {
  audience: string[];
  blocks: MarkdownBlock[];
  didacticContent: DidacticModuleContent | null;
  estimatedMinutes: number;
  id: string;
  priority: number;
  rawBody: string;
  sourceScope: string[];
  status: string;
  summary: string;
  tags: string[];
  title: string;
};

export type DidacticCitation = {
  articleNumber: string | null;
  documentKey: string;
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

export type DidacticCitationReference = {
  citationNumbers: number[];
};

export type DidacticLegalFoundation = DidacticCitationReference & {
  explanation: string;
  title: string;
};

export type DidacticLesson = DidacticCitationReference & {
  everydayExample: string;
  explanation: string;
  normativeDetail: string;
  risk: string;
  streetDecision: string;
  title: string;
  watchFor: string;
};

export type DidacticApplicationCase = DidacticCitationReference & {
  safeMove: string;
  situation: string;
  title: string;
  why: string;
  wrongMove: string;
};

export type DidacticCommonMistake = DidacticCitationReference & {
  betterHabit: string;
  consequence: string;
  mistake: string;
};

export type DidacticChecklistItem = DidacticCitationReference & {
  action: string;
  label: string;
};

export type DidacticQuizQuestion = DidacticCitationReference & {
  answer: string;
  explanation: string;
  options: string[];
  question: string;
};

export type DidacticScenario = DidacticCitationReference & {
  feedback: string;
  safeDecision: string;
  situation: string;
  title: string;
  unsafeChoice: string;
};

export type DidacticVocabularyItem = DidacticCitationReference & {
  meaning: string;
  term: string;
};

export type DidacticModuleContent = {
  applicationCases: DidacticApplicationCase[];
  citations: DidacticCitation[];
  checklist: DidacticChecklistItem[];
  commonMistakes: DidacticCommonMistake[];
  coreIdea: string;
  estimatedMinutes: number | null;
  generatedAt: string;
  generator: string;
  headline: string;
  intro: string;
  learningObjectives: string[];
  legalFoundation: DidacticLegalFoundation[];
  lessons: DidacticLesson[];
  moduleId: string;
  needsHumanReview: string[];
  quiz: DidacticQuizQuestion[];
  reflection: string[];
  retrievalQuery: string;
  scenario: DidacticScenario | null;
  title: string;
  vocabulary: DidacticVocabularyItem[];
  whyItMatters: string;
};

type FrontMatter = Record<string, number | string | string[] | undefined>;

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseInlineArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map(stripQuotes)
      .filter(Boolean);
  }

  return [];
}

function parseFrontMatter(rawFrontMatter: string) {
  const data: FrontMatter = {};
  let activeListKey: string | null = null;

  for (const line of rawFrontMatter.split("\n")) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && activeListKey) {
      const existing = data[activeListKey];
      data[activeListKey] = [
        ...(Array.isArray(existing) ? existing : []),
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

function splitFrontMatter(file: string) {
  const normalized = file.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return { body: normalized, frontMatter: {} };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { body: normalized, frontMatter: {} };
  }

  return {
    body: normalized.slice(end + 5).trim(),
    frontMatter: parseFrontMatter(normalized.slice(4, end)),
  };
}

function parseTable(lines: string[]) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );

  return {
    headers: rows[0] ?? [],
    rows: rows.slice(2).filter((row) => row.some(Boolean)),
    type: "table" as const,
  };
}

function parseMarkdownBlocks(body: string): MarkdownBlock[] {
  const lines = body.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line || line.startsWith("# ")) {
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ level: 2, text: line.slice(3).trim(), type: "heading" });
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ level: 3, text: line.slice(4).trim(), type: "heading" });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (lines[index]?.trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ items, type: "list" });
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (lines[index]?.trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    const paragraph: string[] = [];
    while (
      lines[index] &&
      !lines[index].trim().startsWith("#") &&
      !lines[index].trim().startsWith("- ") &&
      !lines[index].trim().startsWith("|")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push({ text: paragraph.join(" "), type: "paragraph" });
  }

  return blocks;
}

function firstParagraphAfterHeading(body: string, heading: string) {
  const normalized = body.replace(/\r\n/g, "\n");
  const start = normalized.indexOf(`## ${heading}`);
  if (start === -1) return "";

  const afterHeading = normalized.slice(start).split("\n").slice(1);
  const paragraph = afterHeading
    .join("\n")
    .split(/\n\s*\n/)
    .find((block) => block.trim() && !block.trim().startsWith("#"));

  return paragraph?.replace(/\s+/g, " ").trim() ?? "";
}

function asString(value: FrontMatter[string], fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: FrontMatter[string], fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asStringArray(value: FrontMatter[string]) {
  return Array.isArray(value) ? value : [];
}

function readModuleFile(fileName: string): LearningModule {
  const filePath = path.join(MODULES_DIR, fileName);
  const file = readFileSync(filePath, "utf8");
  const { body, frontMatter } = splitFrontMatter(file);
  const id = asString(frontMatter.module_id, fileName.replace(/\.md$/, ""));
  const didacticContent = readDidacticContent(id);

  return {
    audience: asStringArray(frontMatter.audience),
    blocks: parseMarkdownBlocks(body),
    didacticContent,
    estimatedMinutes:
      didacticContent?.estimatedMinutes ??
      asNumber(frontMatter.estimated_minutes, 10),
    id,
    priority: asNumber(frontMatter.priority, 99),
    rawBody: body,
    sourceScope: asStringArray(frontMatter.source_scope),
    status: asString(frontMatter.status, "draft"),
    summary:
      didacticContent?.intro ?? firstParagraphAfterHeading(body, "Proposito"),
    tags: asStringArray(frontMatter.tags),
    title: asString(frontMatter.title, id),
  };
}

function readDidacticContent(id: string): DidacticModuleContent | null {
  const filePath = path.join(GENERATED_MODULES_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;

  return JSON.parse(readFileSync(filePath, "utf8")) as DidacticModuleContent;
}

export function getLearningModules() {
  return readdirSync(MODULES_DIR)
    .filter((file) => file.endsWith(".md"))
    .map(readModuleFile)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function getLearningModuleIds() {
  return getLearningModules().map((module) => module.id);
}

export function getLearningModule(id: string) {
  return getLearningModules().find((module) => module.id === id);
}
