import type { InfractionType } from "./traffic-rules";

export type KnowledgeModule = {
  id: string;
  title: string;
  summary: string;
  content: string;
  ruleKeys: InfractionType[];
  prerequisites: string[];
};
