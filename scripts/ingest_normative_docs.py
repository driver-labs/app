#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: pdfplumber. Install it with "
        "`python -m pip install -r scripts/requirements-rag.txt`."
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "assets"
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
MAX_CHARS = int(os.getenv("RAG_MAX_CHARS", "6500"))
EMBED_BATCH_SIZE = int(os.getenv("RAG_EMBED_BATCH_SIZE", "48"))

ARTICLE_RE = re.compile(r"(?m)^[\"'“”]?\s*Art\.?\s*(\d+[A-Za-z]?)\s*\.?-")
SECTION_RE = re.compile(
    r"^(T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N|LIBRO|FINALIDAD|"
    r"AMBITO DE APLICACION|[ÁÉÍÓÚÜA-Z0-9 ,;:()/-]{8,})$"
)


@dataclass(frozen=True)
class SourceDocument:
    key: str
    name: str
    filename: str
    source_url: str


DOCUMENTS = [
    SourceDocument(
        key="ley-transporte-terrestre",
        name="Ley de Transporte Terrestre, Tránsito y Seguridad Vial",
        filename="Ley_de_Transporte_Terrestre_Transito_y_Seguridad_Vial.pdf",
        source_url="assets/Ley_de_Transporte_Terrestre_Transito_y_Seguridad_Vial.pdf",
    ),
    SourceDocument(
        key="reglamento-general-transito",
        name="Reglamento General de Tránsito y Seguridad Vial",
        filename="REGLAMENTO-GENERAL-DE-TRANSITO-Y-SEGURIDAD-VIAL.pdf",
        source_url="assets/REGLAMENTO-GENERAL-DE-TRANSITO-Y-SEGURIDAD-VIAL.pdf",
    ),
    SourceDocument(
        key="decreto-legislativo-185",
        name="Decreto Legislativo No. 185",
        filename="DL_185_Reformas_a_la_Ley_de_Transporte_Terrestre__Transito_y_Seguridad_Vial._2024.pdf",
        source_url="assets/DL_185_Reformas_a_la_Ley_de_Transporte_Terrestre__Transito_y_Seguridad_Vial._2024.pdf",
    ),
]


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


def clean_extracted_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    lines = []

    for line in text.splitlines():
        clean_line = re.sub(r"[ \t]+", " ", line).strip()
        if not clean_line or clean_line.isdigit():
            continue
        if clean_line.lower() == "jurisprudencia aplicada":
            continue
        lines.append(clean_line)

    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact_for_embedding(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def extract_pdf_text(path: Path) -> tuple[str, list[tuple[int, int]]]:
    page_offsets: list[tuple[int, int]] = []
    parts: list[str] = []
    cursor = 0

    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            page_text = clean_extracted_text(page.extract_text() or "")
            if not page_text:
                continue
            if parts:
                parts.append("\n\n")
                cursor += 2
            page_offsets.append((page_number, cursor))
            parts.append(page_text)
            cursor += len(page_text)

    return "".join(parts), page_offsets


def page_for_offset(page_offsets: list[tuple[int, int]], offset: int) -> int | None:
    page = None
    for page_number, start in page_offsets:
        if start <= offset:
            page = page_number
        else:
            break
    return page


def section_before(text: str, start: int) -> str | None:
    lines = [line.strip() for line in text[:start].splitlines() if line.strip()]
    candidates: list[str] = []

    for line in reversed(lines[-40:]):
        normalized = line.strip(" .")
        if normalized.upper() in {"POR TANTO", "DECRETA", "CONSIDERANDO"}:
            continue
        if SECTION_RE.match(normalized) and len(normalized) <= 140:
            candidates.append(normalized)
            if len(candidates) == 3:
                break

    if not candidates:
        return None

    return " > ".join(reversed(candidates))


def split_long_text(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for paragraph in re.split(r"\n{2,}", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        if len(paragraph) > max_chars:
            if current:
                chunks.append("\n\n".join(current).strip())
                current = []
                current_len = 0
            for start in range(0, len(paragraph), max_chars):
                chunks.append(paragraph[start : start + max_chars].strip())
            continue

        next_len = current_len + len(paragraph) + (2 if current else 0)
        if current and next_len > max_chars:
            chunks.append("\n\n".join(current).strip())
            current = [paragraph]
            current_len = len(paragraph)
        else:
            current.append(paragraph)
            current_len = next_len

    if current:
        chunks.append("\n\n".join(current).strip())

    return chunks


def build_chunks(document: SourceDocument) -> list[dict[str, Any]]:
    pdf_path = ASSETS_DIR / document.filename
    if not pdf_path.exists():
        raise FileNotFoundError(f"Missing source PDF: {pdf_path}")

    full_text, page_offsets = extract_pdf_text(pdf_path)
    matches = list(ARTICLE_RE.finditer(full_text))
    units: list[dict[str, Any]] = []

    if matches and matches[0].start() > 800:
        preamble = full_text[: matches[0].start()].strip()
        units.append(
            {
                "article_number": None,
                "section_title": "Preámbulo",
                "text": preamble,
                "start": 0,
                "end": matches[0].start(),
            }
        )

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(full_text)
        article_text = full_text[start:end].strip()
        if not article_text:
            continue

        units.append(
            {
                "article_number": match.group(1),
                "section_title": section_before(full_text, start),
                "text": article_text,
                "start": start,
                "end": end,
            }
        )

    if not units and full_text:
        units.append(
            {
                "article_number": None,
                "section_title": None,
                "text": full_text,
                "start": 0,
                "end": len(full_text),
            }
        )

    ingested_at = datetime.now(timezone.utc).isoformat()
    chunks: list[dict[str, Any]] = []

    for unit in units:
        text_parts = split_long_text(unit["text"])
        for chunk_index, text_original in enumerate(text_parts):
            content = compact_for_embedding(text_original)
            content_hash = hashlib.sha256(
                f"{document.key}:{unit['article_number']}:{chunk_index}:{content}".encode(
                    "utf-8"
                )
            ).hexdigest()

            chunks.append(
                {
                    "document_key": document.key,
                    "document_name": document.name,
                    "article_number": unit["article_number"],
                    "section_title": unit["section_title"],
                    "source_url": document.source_url,
                    "source_path": str(Path("assets") / document.filename),
                    "page_start": page_for_offset(page_offsets, unit["start"]),
                    "page_end": page_for_offset(page_offsets, max(unit["end"] - 1, unit["start"])),
                    "chunk_index": chunk_index,
                    "content": content,
                    "text_original": text_original,
                    "content_hash": content_hash,
                    "metadata": {
                        "source_file": document.filename,
                        "article_number": unit["article_number"],
                        "part": chunk_index + 1,
                        "parts_total": len(text_parts),
                        "char_count": len(content),
                    },
                    "embedding_model": EMBEDDING_MODEL,
                    "ingested_at": ingested_at,
                }
            )

    return chunks


def get_required_env(name: str, alternatives: list[str] | None = None) -> str:
    keys = [name, *(alternatives or [])]
    for key in keys:
        value = os.getenv(key)
        if value:
            return value
    raise SystemExit(f"Missing environment variable: {name}")


def post_json(url: str, headers: dict[str, str], payload: Any) -> Any:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Request failed with HTTP {exc.code}: {body}") from exc


def supabase_delete_document(
    supabase_url: str, supabase_key: str, document_key: str
) -> None:
    query = urllib.parse.urlencode({"document_key": f"eq.{document_key}"})
    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/rest/v1/normative_chunks?{query}",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Prefer": "return=minimal",
        },
        method="DELETE",
    )

    try:
        with urllib.request.urlopen(request, timeout=120):
            return
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase delete failed with HTTP {exc.code}: {body}") from exc


def create_embeddings(texts: list[str], api_key: str) -> list[list[float]]:
    embeddings: list[list[float]] = []
    headers = {"Authorization": f"Bearer {api_key}"}

    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[start : start + EMBED_BATCH_SIZE]
        response = post_json(
            "https://api.openai.com/v1/embeddings",
            headers,
            {"model": EMBEDDING_MODEL, "input": batch},
        )
        embeddings.extend(item["embedding"] for item in response["data"])
        print(f"Embedded {min(start + len(batch), len(texts))}/{len(texts)} chunks")

    return embeddings


def upload_chunks(
    supabase_url: str, supabase_key: str, document: SourceDocument, chunks: list[dict[str, Any]]
) -> None:
    supabase_delete_document(supabase_url, supabase_key, document.key)
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Prefer": "return=minimal",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/normative_chunks"

    for start in range(0, len(chunks), 100):
        batch = chunks[start : start + 100]
        post_json(url, headers, batch)
        print(f"Uploaded {document.key}: {min(start + len(batch), len(chunks))}/{len(chunks)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest Salvadoran transit law PDFs into Supabase pgvector."
    )
    parser.add_argument("--dry-run", action="store_true", help="Extract and split only.")
    parser.add_argument(
        "--only",
        choices=[document.key for document in DOCUMENTS],
        help="Process one document key only.",
    )
    return parser.parse_args()


def main() -> int:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")
    args = parse_args()

    selected_documents = [
        document for document in DOCUMENTS if args.only is None or document.key == args.only
    ]
    chunks_by_document = {document.key: build_chunks(document) for document in selected_documents}

    total_chunks = sum(len(chunks) for chunks in chunks_by_document.values())
    for document in selected_documents:
        chunks = chunks_by_document[document.key]
        articles = {chunk["article_number"] for chunk in chunks if chunk["article_number"]}
        print(
            f"{document.name}: {len(chunks)} chunks, "
            f"{len(articles)} artículos/unidades con número"
        )

    print(f"Total: {total_chunks} chunks")

    if args.dry_run:
        return 0

    openai_api_key = get_required_env("OPENAI_API_KEY", ["OpenAI_key"])
    supabase_url = get_required_env("SUPABASE_URL", ["NEXT_PUBLIC_SUPABASE_URL"])
    supabase_key = get_required_env("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_RAG_WRITE_KEY"])

    for document in selected_documents:
        chunks = chunks_by_document[document.key]
        embeddings = create_embeddings([chunk["content"] for chunk in chunks], openai_api_key)
        rows = [
            {**chunk, "embedding": embedding}
            for chunk, embedding in zip(chunks, embeddings, strict=True)
        ]
        upload_chunks(supabase_url, supabase_key, document, rows)

    print("Ingest completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
