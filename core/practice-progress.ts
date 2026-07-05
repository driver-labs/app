import type { ScenarioDefinition } from "./scenario-definition";

export type PracticeStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "mastered";

export type UserModuleProgress = {
  userId: string;
  moduleId: string;
  status: PracticeStatus;
  progressPercent: number;
  totalScenarios: number;
  completedScenarios: number;
  attemptsCount: number;
  bestScore: number | null;
  lastScore: number | null;
  lessonsPracticed: string[];
  lessonsLearned: string[];
  firstStartedAt: string | null;
  lastPracticedAt: string | null;
  completedAt: string | null;
};

export type UserScenarioAttempt = {
  id: string;
  userId: string;
  moduleId: string;
  scenarioId: string;
  startedAt: string;
  completedAt: string | null;
  score: number;
  passed: boolean;
  selectedAnswers: {
    interactionId: string;
    selectedOptionId: string;
    isCorrect: boolean;
    scoreDelta: number;
  }[];
  mistakes: {
    type: string;
    message: string;
    lessonId?: string;
  }[];
  lessonsPracticed: string[];
  lessonsLearned: string[];
};

export type PracticeProgressStore = {
  attempts: UserScenarioAttempt[];
  modules: Record<string, UserModuleProgress>;
};

export const PRACTICE_PROGRESS_KEY = "driver-labs:practice-progress:v1";
export const LEGACY_COMPLETED_SCENARIOS_KEY = "driver-labs:completed-scenarios";
export const MAX_STORED_ATTEMPTS = 100;

export const emptyPracticeProgress = (): PracticeProgressStore => ({
  attempts: [],
  modules: {},
});

export function isCorrectScenarioSelection(
  scenario: ScenarioDefinition,
  selectedOptionIds: string[],
) {
  const interaction = scenario.simulation.interactions[0];
  const selected = new Set(selectedOptionIds);

  return interaction.options.every((option) =>
    option.isCorrect ? selected.has(option.id) : !selected.has(option.id),
  );
}

export function calculateScenarioScore(
  scenario: ScenarioDefinition,
  selectedOptionIds: string[],
) {
  if (selectedOptionIds.length === 0) return 0;

  if (isCorrectScenarioSelection(scenario, selectedOptionIds)) {
    return scenario.scoring.maxScore;
  }

  const interaction = scenario.simulation.interactions[0];
  const selected = new Set(selectedOptionIds);
  const delta = interaction.options
    .filter((option) => selected.has(option.id))
    .reduce((sum, option) => sum + option.scoreDelta, 0);

  return Math.max(
    0,
    Math.min(
      scenario.scoring.maxScore,
      Math.round(scenario.scoring.passScore - 35 + delta),
    ),
  );
}

export function buildScenarioAttempt({
  completedAt,
  id,
  scenario,
  selectedOptionIds,
  startedAt,
  userId,
}: {
  completedAt: string;
  id: string;
  scenario: ScenarioDefinition;
  selectedOptionIds: string[];
  startedAt: string;
  userId: string;
}): UserScenarioAttempt {
  const interaction = scenario.simulation.interactions[0];
  const selected = new Set(selectedOptionIds);
  const score = calculateScenarioScore(scenario, selectedOptionIds);
  const passed =
    score >= scenario.scoring.passScore &&
    isCorrectScenarioSelection(scenario, selectedOptionIds);
  const mistakes: UserScenarioAttempt["mistakes"] = [];

  for (const option of interaction.options) {
    if (selected.has(option.id) && !option.isCorrect) {
      mistakes.push({
        lessonId: scenario.learning.lessonIds[0],
        message: option.label,
        type: "unsafe_choice",
      });
    }

    if (!selected.has(option.id) && option.isCorrect) {
      mistakes.push({
        lessonId: scenario.learning.lessonIds[0],
        message: "No se eligió la acción segura esperada.",
        type: "missed_safe_action",
      });
    }
  }

  return {
    completedAt,
    id,
    lessonsLearned: passed ? scenario.learning.lessonIds : [],
    lessonsPracticed: scenario.learning.lessonIds,
    mistakes,
    moduleId: scenario.moduleBinding.moduleId,
    passed,
    scenarioId: scenario.id,
    score,
    selectedAnswers: interaction.options
      .filter((option) => selected.has(option.id))
      .map((option) => ({
        interactionId: interaction.id,
        isCorrect: option.isCorrect,
        scoreDelta: option.scoreDelta,
        selectedOptionId: option.id,
      })),
    startedAt,
    userId,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function applyScenarioAttempt(
  store: PracticeProgressStore,
  attempt: UserScenarioAttempt,
  totalScenariosForModule = 1,
): PracticeProgressStore {
  const attempts = [...store.attempts, attempt].slice(-MAX_STORED_ATTEMPTS);
  const existing = store.modules[attempt.moduleId];
  const moduleAttempts = attempts.filter(
    (item) => item.moduleId === attempt.moduleId,
  );
  const passedScenarioIds = new Set(
    moduleAttempts.filter((item) => item.passed).map((item) => item.scenarioId),
  );
  const completedScenarios = Math.max(
    passedScenarioIds.size,
    existing?.completedScenarios ?? 0,
  );
  const attemptsCount = Math.max(
    moduleAttempts.length,
    (existing?.attemptsCount ?? 0) + 1,
  );
  const bestScore = Math.max(
    existing?.bestScore ?? 0,
    ...moduleAttempts.map((item) => item.score),
  );
  const progressPercent =
    totalScenariosForModule > 0
      ? Math.round((completedScenarios / totalScenariosForModule) * 100)
      : 0;
  const status: PracticeStatus =
    progressPercent >= 100 && bestScore >= 95
      ? "mastered"
      : progressPercent >= 100
        ? "completed"
        : "in_progress";

  return {
    attempts,
    modules: {
      ...store.modules,
      [attempt.moduleId]: {
        attemptsCount,
        bestScore,
        completedAt:
          progressPercent >= 100
            ? (existing?.completedAt ?? attempt.completedAt)
            : null,
        completedScenarios,
        firstStartedAt: existing?.firstStartedAt ?? attempt.startedAt,
        lastPracticedAt: attempt.completedAt,
        lastScore: attempt.score,
        lessonsLearned: unique([
          ...(existing?.lessonsLearned ?? []),
          ...attempt.lessonsLearned,
        ]),
        lessonsPracticed: unique([
          ...(existing?.lessonsPracticed ?? []),
          ...attempt.lessonsPracticed,
        ]),
        moduleId: attempt.moduleId,
        progressPercent,
        status,
        totalScenarios: totalScenariosForModule,
        userId: attempt.userId,
      },
    },
  };
}
