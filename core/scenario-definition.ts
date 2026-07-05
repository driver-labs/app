import { z } from "zod";
import { type Scenario, ScenarioSchema } from "./scenario-schema";
import {
  TRAFFIC_RULES,
  type InfractionType as TrafficInfractionType,
} from "./traffic-rules";

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const ScenarioAssetSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  url: z.string().min(1),
});

export const ScenarioActorSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  role: z.string().min(1),
  initialPosition: Vector3Schema,
  initialRotation: Vector3Schema,
  scale: Vector3Schema,
  tags: z.array(z.string()).default([]),
});

export const ScenarioTimelineEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["animate_actor", "trigger"]),
  actorId: z.string().optional(),
  track: z.enum(["position", "rotation", "scale"]).optional(),
  keyframes: z
    .array(
      z.object({
        t: z.number().min(0),
        value: Vector3Schema,
      }),
    )
    .optional(),
  interpolation: z.enum(["linear", "smooth"]).optional(),
  at: z.number().min(0).optional(),
  trigger: z
    .object({
      kind: z.literal("show_interaction"),
      interactionId: z.string().min(1),
    })
    .optional(),
});

export const ScenarioInteractionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["multiple_choice"]),
  appearsAt: z.number().min(0),
  prompt: z.string().min(1),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        isCorrect: z.boolean(),
        scoreDelta: z.number(),
      }),
    )
    .min(2),
  correctOptionId: z.string().min(1),
});

export const ScenarioDefinitionSchema = z.object({
  schemaVersion: z.literal("drivelab.scenario.v1"),
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  moduleBinding: z.object({
    moduleId: z.string().min(1),
    isPrimaryScenario: z.boolean(),
  }),
  learning: z.object({
    lessonIds: z.array(z.string().min(1)).min(1),
    objectives: z.array(z.string().min(1)).min(1),
    feedback: z.object({
      success: z.string().min(1),
      failure: z.string().min(1),
      hints: z.array(z.string().min(1)).min(1),
    }),
    legalReferences: z
      .array(
        z.object({
          jurisdiction: z.string().min(1),
          document: z.string().min(1),
          articleId: z.string().optional(),
          ruleCategory: z.string().min(1),
        }),
      )
      .default([]),
  }),
  simulation: z.object({
    pattern: z.string().min(1),
    durationSeconds: z.number().positive(),
    world: z.object({
      environment: z.string().min(1),
      roadType: z.string().min(1),
      weather: z.string().min(1),
      timeOfDay: z.string().min(1),
      units: z.literal("meters"),
    }),
    camera: z.object({
      mode: z.enum(["fixed", "third_person_follow", "top_down", "cinematic"]),
      targetActorId: z.string().optional(),
      position: Vector3Schema,
      lookAt: Vector3Schema,
      fov: z.number().positive(),
    }),
    assets: z.array(ScenarioAssetSchema).min(1),
    actors: z.array(ScenarioActorSchema).min(1),
    timeline: z.array(ScenarioTimelineEventSchema).min(1),
    interactions: z.array(ScenarioInteractionSchema).min(1),
  }),
  scoring: z.object({
    maxScore: z.number().positive(),
    passScore: z.number().positive(),
    metrics: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          weight: z.number().positive(),
        }),
      )
      .min(1),
  }),
  metadata: z.object({
    difficulty: z.enum(["basic", "intermediate", "advanced"]),
    estimatedMinutes: z.number().positive(),
    tags: z.array(z.string()).default([]),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
});

export const ModuleScenarioBindingSchema = z.object({
  moduleId: z.string().min(1),
  scenarioId: z.string().min(1),
  isPrimary: z.boolean(),
  order: z.number().int().positive(),
  status: z.enum(["draft", "active", "archived"]),
});

export type ScenarioAsset = z.infer<typeof ScenarioAssetSchema>;
export type ScenarioActor = z.infer<typeof ScenarioActorSchema>;
export type ScenarioTimelineEvent = z.infer<typeof ScenarioTimelineEventSchema>;
export type ScenarioInteraction = z.infer<typeof ScenarioInteractionSchema>;
export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
export type ModuleScenarioBinding = z.infer<typeof ModuleScenarioBindingSchema>;

type ValidationInput = {
  bindings: ModuleScenarioBinding[];
  moduleIds: string[];
  scenarios: ScenarioDefinition[];
};

type ScenarioValidationIssue = {
  id: string;
  message: string;
};

const patternToSceneKind: Record<string, Scenario["sceneKind"]> = {
  bus_stop_hazard: "bus-stop",
  document_checkpoint: "intersection-stop",
  phone_distraction: "distraction",
  motorcycle_awareness: "lane-change",
  pedestrian_crossing: "crosswalk",
  roundabout_priority: "roundabout",
  safe_following_distance: "rain-braking",
  school_zone_crossing: "crosswalk",
  speed_low_visibility: "rain-braking",
  stop_intersection: "intersection-stop",
  traffic_light_decision: "intersection-light",
  unsafe_lane_change: "lane-change",
  unsafe_overtake: "straight-overtake",
  vehicle_safety_rain: "rain-braking",
};

const patternToInfraction: Record<string, TrafficInfractionType> = {
  bus_stop_hazard: "blind-overtake",
  document_checkpoint: "no-seatbelt",
  phone_distraction: "phone-use",
  motorcycle_awareness: "unsafe-lane-change",
  pedestrian_crossing: "no-pedestrian-yield",
  roundabout_priority: "no-yield",
  safe_following_distance: "tailgating",
  school_zone_crossing: "no-pedestrian-yield",
  speed_low_visibility: "speeding",
  stop_intersection: "run-stop",
  traffic_light_decision: "run-red",
  unsafe_lane_change: "unsafe-lane-change",
  unsafe_overtake: "cross-solid-line",
  vehicle_safety_rain: "speeding",
};

const difficultyToLegacy: Record<
  ScenarioDefinition["metadata"]["difficulty"],
  Scenario["difficulty"]
> = {
  advanced: "hard",
  basic: "easy",
  intermediate: "medium",
};

function toLegacyEnvironment(
  value: ScenarioDefinition["simulation"]["world"],
): Scenario["environment"] {
  return {
    setting:
      value.environment === "highway" || value.environment === "rural"
        ? value.environment
        : "urban",
    timeOfDay:
      value.timeOfDay === "night" || value.timeOfDay === "dusk"
        ? value.timeOfDay
        : "day",
    weather:
      value.weather === "rain" || value.weather === "fog"
        ? value.weather
        : "clear",
  };
}

function toLegacyRoad(definition: ScenarioDefinition): Scenario["road"] {
  const pattern = definition.simulation.pattern;
  const control =
    pattern === "stop_intersection"
      ? "stop-sign"
      : pattern === "traffic_light_decision"
        ? "traffic-light"
        : pattern === "roundabout_priority"
          ? "yield"
          : "none";

  return {
    centerLine: pattern === "unsafe_overtake" ? "double-solid" : "dashed",
    control,
    crosswalk:
      pattern === "pedestrian_crossing" ||
      pattern === "school_zone_crossing" ||
      pattern === "safe_following_distance",
    lanes: definition.simulation.world.roadType.includes("multi") ? 3 : 2,
    speedLimit:
      pattern === "speed_low_visibility" || pattern === "vehicle_safety_rain"
        ? 50
        : undefined,
  };
}

function actorKind(actor: ScenarioActor): Scenario["actors"][number]["kind"] {
  const text = `${actor.role} ${actor.assetId} ${actor.tags.join(" ")}`;
  if (text.includes("motorcycle") || text.includes("moto")) return "motorcycle";
  if (text.includes("pedestrian") || text.includes("peaton"))
    return "pedestrian";
  if (text.includes("bus")) return "bus";
  if (text.includes("truck") || text.includes("camion")) return "truck";
  return "car";
}

function actorRole(actor: ScenarioActor): Scenario["actors"][number]["role"] {
  if (actor.role.includes("offender")) return "offender";
  if (actor.role.includes("oncoming")) return "oncoming";
  if (actor.role.includes("ego") || actor.role.includes("player"))
    return "player";
  return "traffic";
}

export function toPlayableScenario(definition: ScenarioDefinition): Scenario {
  const interaction = definition.simulation.interactions[0];
  const correctOption = interaction.options.find(
    (option) => option.id === interaction.correctOptionId,
  );
  const infraction =
    patternToInfraction[definition.simulation.pattern] ?? "run-stop";
  const rule = TRAFFIC_RULES[infraction];

  return ScenarioSchema.parse({
    actors: definition.simulation.actors.map((actor) => ({
      id: actor.id,
      kind: actorKind(actor),
      model: actor.assetId.replace(/^asset_/, ""),
      role: actorRole(actor),
      maneuver:
        actor.tags.includes("crossing") || actor.role.includes("pedestrian")
          ? "cross"
          : actor.tags.includes("lane_change")
            ? "change-lane"
            : actor.tags.includes("stopped")
              ? "stop-yield"
              : "straight",
      speed: actor.tags.includes("fast") ? "fast" : "normal",
      startLane: actor.tags.includes("oncoming") ? "oncoming" : "right",
      commitsInfraction:
        actor.role.includes("offender") || actor.role.includes("ego")
          ? infraction
          : undefined,
    })),
    choices: interaction.options.map((option) => ({
      consequence: option.isCorrect ? "safe-pass" : "near-miss",
      correct: option.id === correctOption?.id,
      id: option.id,
      label: option.label,
    })),
    difficulty: difficultyToLegacy[definition.metadata.difficulty],
    environment: toLegacyEnvironment(definition.simulation.world),
    event: {
      infractionType: infraction,
      outcome:
        definition.simulation.pattern === "unsafe_lane_change" ||
        definition.simulation.pattern === "stop_intersection"
          ? "crash"
          : "near-miss",
    },
    feedback: {
      fail: definition.learning.feedback.failure,
      success: definition.learning.feedback.success,
    },
    format:
      interaction.options.filter((option) => option.isCorrect).length > 1
        ? "diagnosis"
        : "decision",
    id: definition.id,
    lawRefs:
      rule.refs.length > 0
        ? rule.refs
        : definition.learning.legalReferences.map((reference) => ({
            code: reference.articleId
              ? `${reference.document}, ${reference.articleId}`
              : reference.document,
            summary: reference.ruleCategory,
          })),
    learningObjective: definition.learning.objectives[0],
    prompt: interaction.prompt,
    road: toLegacyRoad(definition),
    rule: rule.explanation,
    sceneKind:
      patternToSceneKind[definition.simulation.pattern] ?? "intersection-stop",
    selectionType:
      interaction.options.filter((option) => option.isCorrect).length > 1
        ? "multiple"
        : "single",
    title: definition.title,
  });
}

export function validateScenarioDefinition(
  scenario: ScenarioDefinition,
  binding?: ModuleScenarioBinding,
): ScenarioValidationIssue[] {
  const issues: ScenarioValidationIssue[] = [];
  const assetIds = new Set(scenario.simulation.assets.map((asset) => asset.id));
  const actorIds = new Set(scenario.simulation.actors.map((actor) => actor.id));
  const interactionIds = new Set(
    scenario.simulation.interactions.map((interaction) => interaction.id),
  );

  if (binding && binding.moduleId !== scenario.moduleBinding.moduleId) {
    issues.push({
      id: scenario.id,
      message:
        "Binding moduleId does not match scenario moduleBinding.moduleId.",
    });
  }

  if (binding && binding.scenarioId !== scenario.id) {
    issues.push({
      id: scenario.id,
      message: "Binding scenarioId does not match scenario id.",
    });
  }

  for (const actor of scenario.simulation.actors) {
    if (!assetIds.has(actor.assetId)) {
      issues.push({
        id: scenario.id,
        message: `Actor ${actor.id} references missing asset ${actor.assetId}.`,
      });
    }
  }

  for (const event of scenario.simulation.timeline) {
    if (event.actorId && !actorIds.has(event.actorId)) {
      issues.push({
        id: scenario.id,
        message: `Timeline event ${event.id} references missing actor ${event.actorId}.`,
      });
    }

    if (
      event.trigger?.kind === "show_interaction" &&
      !interactionIds.has(event.trigger.interactionId)
    ) {
      issues.push({
        id: scenario.id,
        message: `Timeline event ${event.id} references missing interaction ${event.trigger.interactionId}.`,
      });
    }
  }

  for (const interaction of scenario.simulation.interactions) {
    if (
      !interaction.options.some(
        (option) =>
          option.id === interaction.correctOptionId && option.isCorrect,
      )
    ) {
      issues.push({
        id: scenario.id,
        message: `Interaction ${interaction.id} has no valid correct answer.`,
      });
    }
  }

  if (scenario.scoring.passScore > scenario.scoring.maxScore) {
    issues.push({
      id: scenario.id,
      message: "passScore cannot be greater than maxScore.",
    });
  }

  return issues;
}

export function validateScenarioCatalog({
  bindings,
  moduleIds,
  scenarios,
}: ValidationInput): ScenarioValidationIssue[] {
  const issues: ScenarioValidationIssue[] = [];
  const moduleIdSet = new Set(moduleIds);
  const scenarioById = new Map(
    scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const activeBindings = bindings.filter(
    (binding) => binding.status === "active",
  );

  for (const moduleId of moduleIds) {
    if (!activeBindings.some((binding) => binding.moduleId === moduleId)) {
      issues.push({
        id: moduleId,
        message: "Module has no active scenario binding.",
      });
    }
  }

  for (const binding of activeBindings) {
    if (!moduleIdSet.has(binding.moduleId)) {
      issues.push({
        id: binding.moduleId,
        message: "Scenario binding references a module that does not exist.",
      });
    }

    const scenario = scenarioById.get(binding.scenarioId);
    if (!scenario) {
      issues.push({
        id: binding.scenarioId,
        message: "Scenario binding references a scenario that does not exist.",
      });
      continue;
    }

    issues.push(...validateScenarioDefinition(scenario, binding));
  }

  return issues;
}
