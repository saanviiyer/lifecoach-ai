export interface Objective {
  id: string;
  text: string;
}

export interface Milestone {
  title: string;
  description: string;
}

export interface Phase {
  name: string;
  durationLabel: string;
  summary: string;
  milestones: Milestone[];
  dailyObjectives?: Objective[];
}

export interface Roadmap {
  ambition: string;
  timeframe: string;
  overview: string;
  phases: Phase[];
}

export interface GoalInput {
  ambition: string;
  timeframe: string;
  situation: string;
  constraints: string;
}

export type ChatRole = "user" | "coach" | "system";

export interface ChatMessage {
  id: string;
  author: string;
  role: ChatRole;
  text: string;
  ts: number;
}
