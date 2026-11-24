import type { ConfirmedPlacement, ReadinessSummary } from "./contract";

export type Role = "student" | "supervisor" | "advisor";

export interface Outcome {
  id: string;
  title: string;
}

export interface DraftGoal {
  outcomeId: string;
  text: string;
}

export interface Goal {
  id: string;
  outcomeId: string;
  text: string;
}

export interface LogVersion {
  version: number;
  entry: string;
  evidenceId: string | null;
  at: string;
}

export interface FeedbackNote {
  onVersion: number;
  text: string;
  at: string;
}

export type LogStatus = "submitted" | "feedback_requested" | "revised";

export interface LogEntry {
  id: string;
  goalId: string;
  status: LogStatus;
  versions: LogVersion[];
  feedback: FeedbackNote[];
}

export interface OutcomeReview {
  outcomeId: string;
  judgement: "evidenced" | "missing";
  evidenceId: string | null;
}

export interface SupportAction {
  id: string;
  goalId: string;
  title: string;
  owner: Role;
  due: string;
  closure: string | null;
  closedOn: string | null;
}

export interface FinalReview {
  employer: string | null;
  advisor: string | null;
  nextGoal: string | null;
}

export interface State {
  actor: Role;
  placement: ConfirmedPlacement;
  readiness: ReadinessSummary | null;
  outcomes: Outcome[];
  period: { id: string; start: string; end: string };
  agreement: "draft" | "agreed";
  drafts: DraftGoal[];
  goals: Goal[];
  logs: LogEntry[];
  reviews: OutcomeReview[];
  actions: SupportAction[];
  finalReview: FinalReview;
  seq: number;
}
