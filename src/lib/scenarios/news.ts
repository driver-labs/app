import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  type ScenarioDefinition,
  ScenarioDefinitionSchema,
  toPlayableScenario,
  validateScenarioDefinition,
} from "@/core/scenario-definition";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type NewsScenario = {
  definition: ScenarioDefinition;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
  newsPublishedAt: string | null;
  newsSummary: string | null;
  generationMode: string;
  createdAt: string;
};

type NewsScenarioRow = {
  id: string;
  definition: unknown;
  news_title: string;
  news_url: string;
  news_source: string;
  news_published_at: string | null;
  news_summary: string | null;
  generation_mode: string;
  created_at: string;
};

const ROW_COLUMNS =
  "id, definition, news_title, news_url, news_source, news_published_at, news_summary, generation_mode, created_at";

function createAnonClient() {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseEnv();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });
}

function parseRow(row: NewsScenarioRow): NewsScenario | null {
  const parsed = ScenarioDefinitionSchema.safeParse(row.definition);
  if (!parsed.success) return null;
  if (validateScenarioDefinition(parsed.data).length > 0) return null;

  try {
    toPlayableScenario(parsed.data);
  } catch {
    return null;
  }

  return {
    definition: parsed.data,
    newsTitle: row.news_title,
    newsUrl: row.news_url,
    newsSource: row.news_source,
    newsPublishedAt: row.news_published_at,
    newsSummary: row.news_summary,
    generationMode: row.generation_mode,
    createdAt: row.created_at,
  };
}

export const getNewsScenarios = cache(async (): Promise<NewsScenario[]> => {
  const { data, error } = await createAnonClient()
    .from("news_scenarios")
    .select(ROW_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error || !data) return [];

  return (data as NewsScenarioRow[])
    .map(parseRow)
    .filter((scenario): scenario is NewsScenario => scenario !== null);
});

export const getNewsScenario = cache(
  async (id: string): Promise<NewsScenario | null> => {
    const { data, error } = await createAnonClient()
      .from("news_scenarios")
      .select(ROW_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return parseRow(data as NewsScenarioRow);
  },
);
