import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const userProfile = process.env.USERPROFILE ?? process.env.HOME ?? "";
const bundledPython = join(
  userProfile,
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

const candidates = [
  process.env.PYTHON ? { command: process.env.PYTHON, prefix: [] } : null,
  existsSync(bundledPython) ? { command: bundledPython, prefix: [] } : null,
  { command: "python", prefix: [] },
  { command: "python3", prefix: [] },
  { command: "py", prefix: ["-3"] },
].filter(Boolean);

function canUsePython(candidate) {
  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, "-c", "import pdfplumber"],
    { encoding: "utf-8", shell: false },
  );

  return result.status === 0;
}

const python = candidates.find(canUsePython);

if (!python) {
  console.error(
    [
      "No usable Python with pdfplumber was found.",
      "Install dependencies with:",
      "python -m pip install -r scripts/requirements-rag.txt",
      "",
      "Or set PYTHON to a Python executable that already has pdfplumber installed.",
    ].join("\n"),
  );
  process.exit(1);
}

const result = spawnSync(
  python.command,
  [
    ...python.prefix,
    "scripts/ingest_normative_docs.py",
    ...process.argv.slice(2),
  ],
  { encoding: "utf-8", shell: false, stdio: "inherit" },
);

process.exit(result.status ?? 1);
