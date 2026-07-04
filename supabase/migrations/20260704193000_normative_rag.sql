create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.normative_chunks (
  id uuid primary key default extensions.gen_random_uuid(),
  document_key text not null,
  document_name text not null,
  article_number text,
  section_title text,
  source_url text,
  source_path text,
  page_start integer,
  page_end integer,
  chunk_index integer not null default 0,
  content text not null,
  text_original text not null,
  content_hash text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  embedding_model text not null default 'text-embedding-3-small',
  embedding extensions.vector(1536) not null,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists normative_chunks_document_article_idx
  on public.normative_chunks (document_key, article_number);

create index if not exists normative_chunks_metadata_idx
  on public.normative_chunks using gin (metadata);

create index if not exists normative_chunks_embedding_hnsw_idx
  on public.normative_chunks using hnsw (embedding vector_cosine_ops);

create or replace function public.set_normative_chunks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_normative_chunks_updated_at on public.normative_chunks;
create trigger set_normative_chunks_updated_at
before update on public.normative_chunks
for each row
execute function public.set_normative_chunks_updated_at();

alter table public.normative_chunks enable row level security;

drop policy if exists "Normative chunks are readable" on public.normative_chunks;
create policy "Normative chunks are readable"
on public.normative_chunks
for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.normative_chunks from anon, authenticated;
grant select on public.normative_chunks to anon, authenticated;

create or replace function public.match_normative_chunks (
  query_embedding extensions.vector(1536),
  match_threshold float default 0.50,
  match_count int default 6
)
returns table (
  id uuid,
  document_key text,
  document_name text,
  article_number text,
  section_title text,
  source_url text,
  source_path text,
  page_start integer,
  page_end integer,
  chunk_index integer,
  content text,
  text_original text,
  metadata jsonb,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    normative_chunks.id,
    normative_chunks.document_key,
    normative_chunks.document_name,
    normative_chunks.article_number,
    normative_chunks.section_title,
    normative_chunks.source_url,
    normative_chunks.source_path,
    normative_chunks.page_start,
    normative_chunks.page_end,
    normative_chunks.chunk_index,
    normative_chunks.content,
    normative_chunks.text_original,
    normative_chunks.metadata,
    1 - (normative_chunks.embedding <=> query_embedding) as similarity
  from public.normative_chunks
  where 1 - (normative_chunks.embedding <=> query_embedding) >= match_threshold
  order by normative_chunks.embedding <=> query_embedding asc
  limit least(greatest(match_count, 1), 12);
$$;

grant execute on function public.match_normative_chunks(extensions.vector, float, int)
  to anon, authenticated;
