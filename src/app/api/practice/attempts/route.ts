import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyScenarioAttempt,
  emptyPracticeProgress,
  type PracticeProgressStore,
  type UserModuleProgress,
  type UserScenarioAttempt,
} from "@/core/practice-progress";
import { getScenariosForModule } from "@/core/scenarios";
import { createClient } from "@/lib/supabase/server";

const selectedAnswerSchema = z.object({
  interactionId: z.string(),
  selectedOptionId: z.string(),
  isCorrect: z.boolean(),
  scoreDelta: z.number(),
});

const mistakeSchema = z.object({
  type: z.string(),
  message: z.string(),
  lessonId: z.string().optional(),
});

const attemptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  moduleId: z.string(),
  scenarioId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  selectedAnswers: z.array(selectedAnswerSchema),
  mistakes: z.array(mistakeSchema),
  lessonsPracticed: z.array(z.string()),
  lessonsLearned: z.array(z.string()),
});

function unique(values: string[]) {
  return [...new Set(values)];
}

function toStoredAttempt(
  attempt: UserScenarioAttempt,
  userId: string,
): UserScenarioAttempt {
  return {
    ...attempt,
    userId,
  };
}

function progressRowToStore(
  row: Record<string, unknown> | null,
): PracticeProgressStore {
  if (!row) return emptyPracticeProgress();

  return {
    attempts: [],
    modules: {
      [String(row.module_id)]: {
        attemptsCount: Number(row.attempts_count ?? 0),
        bestScore:
          row.best_score === null || row.best_score === undefined
            ? null
            : Number(row.best_score),
        completedAt:
          typeof row.completed_at === "string" ? row.completed_at : null,
        completedScenarios: Number(row.completed_scenarios ?? 0),
        firstStartedAt:
          typeof row.first_started_at === "string"
            ? row.first_started_at
            : null,
        lastPracticedAt:
          typeof row.last_practiced_at === "string"
            ? row.last_practiced_at
            : null,
        lastScore:
          row.last_score === null || row.last_score === undefined
            ? null
            : Number(row.last_score),
        lessonsLearned: Array.isArray(row.lessons_learned)
          ? row.lessons_learned.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
        lessonsPracticed: Array.isArray(row.lessons_practiced)
          ? row.lessons_practiced.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
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
      },
    },
  };
}

function progressToRow(progress: UserModuleProgress) {
  return {
    attempts_count: progress.attemptsCount,
    best_score: progress.bestScore,
    completed_at: progress.completedAt,
    completed_scenarios: progress.completedScenarios,
    first_started_at: progress.firstStartedAt,
    last_practiced_at: progress.lastPracticedAt,
    last_score: progress.lastScore,
    lessons_learned: progress.lessonsLearned,
    lessons_practiced: progress.lessonsPracticed,
    module_id: progress.moduleId,
    progress_percent: progress.progressPercent,
    status: progress.status,
    total_scenarios: progress.totalScenarios,
    updated_at: new Date().toISOString(),
    user_id: progress.userId,
  };
}

export async function POST(request: Request) {
  const parsed = attemptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid practice attempt payload." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempt = toStoredAttempt(parsed.data, user.id);

  const { error: insertError } = await supabase
    .from("user_scenario_attempts")
    .insert({
      completed_at: attempt.completedAt,
      id: attempt.id,
      lessons_learned: attempt.lessonsLearned,
      lessons_practiced: attempt.lessonsPracticed,
      mistakes: attempt.mistakes,
      module_id: attempt.moduleId,
      passed: attempt.passed,
      scenario_id: attempt.scenarioId,
      score: attempt.score,
      selected_answers: attempt.selectedAnswers,
      started_at: attempt.startedAt,
      user_id: user.id,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: existingProgress } = await supabase
    .from("user_module_progress")
    .select("*")
    .eq("module_id", attempt.moduleId)
    .eq("user_id", user.id)
    .maybeSingle();

  const totalScenarios = Math.max(
    1,
    getScenariosForModule(attempt.moduleId).length,
  );
  const nextStore = applyScenarioAttempt(
    progressRowToStore(existingProgress as Record<string, unknown> | null),
    {
      ...attempt,
      lessonsLearned: unique(attempt.lessonsLearned),
      lessonsPracticed: unique(attempt.lessonsPracticed),
    },
    totalScenarios,
  );
  const moduleProgress = nextStore.modules[attempt.moduleId];

  const { error: upsertError } = await supabase
    .from("user_module_progress")
    .upsert(progressToRow(moduleProgress), {
      onConflict: "user_id,module_id",
    });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt,
    progress: moduleProgress,
  });
}
