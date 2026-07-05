import { NextResponse } from "next/server";
import type {
  PracticeProgressStore,
  UserModuleProgress,
  UserScenarioAttempt,
} from "@/core/practice-progress";
import { createClient } from "@/lib/supabase/server";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toModuleProgress(row: Record<string, unknown>): UserModuleProgress {
  return {
    attemptsCount: Number(row.attempts_count ?? 0),
    bestScore:
      row.best_score === null || row.best_score === undefined
        ? null
        : Number(row.best_score),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    completedScenarios: Number(row.completed_scenarios ?? 0),
    firstStartedAt:
      typeof row.first_started_at === "string" ? row.first_started_at : null,
    lastPracticedAt:
      typeof row.last_practiced_at === "string" ? row.last_practiced_at : null,
    lastScore:
      row.last_score === null || row.last_score === undefined
        ? null
        : Number(row.last_score),
    lessonsLearned: asStringArray(row.lessons_learned),
    lessonsPracticed: asStringArray(row.lessons_practiced),
    moduleId: String(row.module_id),
    progressPercent: Number(row.progress_percent ?? 0),
    status:
      row.status === "completed" ||
      row.status === "mastered" ||
      row.status === "in_progress"
        ? row.status
        : "not_started",
    totalScenarios: Number(row.total_scenarios ?? 1),
    userId: String(row.user_id),
  };
}

function toAttempt(row: Record<string, unknown>): UserScenarioAttempt {
  return {
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    id: String(row.id),
    lessonsLearned: asStringArray(row.lessons_learned),
    lessonsPracticed: asStringArray(row.lessons_practiced),
    mistakes: Array.isArray(row.mistakes)
      ? (row.mistakes as UserScenarioAttempt["mistakes"])
      : [],
    moduleId: String(row.module_id),
    passed: Boolean(row.passed),
    scenarioId: String(row.scenario_id),
    score: Number(row.score ?? 0),
    selectedAnswers: Array.isArray(row.selected_answers)
      ? (row.selected_answers as UserScenarioAttempt["selectedAnswers"])
      : [],
    startedAt: String(row.started_at),
    userId: String(row.user_id),
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    { data: progressRows, error: progressError },
    { data: attemptRows, error: attemptError },
  ] = await Promise.all([
    supabase.from("user_module_progress").select("*").eq("user_id", user.id),
    supabase
      .from("user_scenario_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (progressError || attemptError) {
    return NextResponse.json(
      { error: progressError?.message ?? attemptError?.message },
      { status: 500 },
    );
  }

  const progress: PracticeProgressStore = {
    attempts: (attemptRows ?? []).map((row) =>
      toAttempt(row as Record<string, unknown>),
    ),
    modules: Object.fromEntries(
      (progressRows ?? []).map((row) => {
        const item = toModuleProgress(row as Record<string, unknown>);
        return [item.moduleId, item];
      }),
    ),
  };

  return NextResponse.json({ progress, userId: user.id });
}
