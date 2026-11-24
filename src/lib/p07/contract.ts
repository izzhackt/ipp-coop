export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export const PLACEMENT_CONTRACT = "p04-placement/1" as const;
export const READINESS_CONTRACT = "p06-readiness/1" as const;

export type PlacementSource = "stand-in" | "p04" | "shared-db";
export type ReadinessSource = "stand-in" | "p06" | "shared-db";
export type ReviewOutcome = "pending" | "revision_requested" | "demonstrated" | "not_demonstrated";

export interface ConfirmedPlacement {
  contract: typeof PLACEMENT_CONTRACT;
  placement_id: string;
  student_id: string;
  application_id: string;
  opportunity_id: string;
  opportunity_version: number;
  profile_version: number;
  employer_name: string;
  title: string;
  city: string;
  supervisor_name: string;
  start_date: string;
  end_date: string;
  confirmed_by: string;
  confirmed_at: string;
  university_status: "confirmed";
  source: PlacementSource;
}

export interface ReadinessItem {
  skill_id: string;
  evidence_id: string;
  activity: string;
  review_outcome: ReviewOutcome;
  reviewer: string | null;
  reviewed_at: string | null;
}

export interface ReadinessSummary {
  contract: typeof READINESS_CONTRACT;
  student_id: string;
  summary_id: string;
  items: ReadinessItem[];
  source: ReadinessSource;
}

export function acceptPlacement(input: unknown): ConfirmedPlacement {
  const row = record(input, "Placement");
  if (row["contract"] !== PLACEMENT_CONTRACT) {
    throw new ContractError(`Placement contract must be ${PLACEMENT_CONTRACT}.`);
  }
  if (row["university_status"] !== "confirmed") {
    throw new ContractError("P07 accepts a placement only after the university confirms it.");
  }
  const start = day(text(row, "start_date"), "Start date");
  const end = day(text(row, "end_date"), "End date");
  if (end < start) throw new ContractError("End date is before the start date.");
  const source = row["source"];
  return {
    contract: PLACEMENT_CONTRACT,
    placement_id: text(row, "placement_id"),
    student_id: text(row, "student_id"),
    application_id: text(row, "application_id"),
    opportunity_id: text(row, "opportunity_id"),
    opportunity_version: whole(row, "opportunity_version"),
    profile_version: whole(row, "profile_version"),
    employer_name: text(row, "employer_name"),
    title: text(row, "title"),
    city: text(row, "city"),
    supervisor_name: text(row, "supervisor_name"),
    start_date: start,
    end_date: end,
    confirmed_by: text(row, "confirmed_by"),
    confirmed_at: text(row, "confirmed_at"),
    university_status: "confirmed",
    source: source === "stand-in" || source === "shared-db" ? source : "p04",
  };
}

export function acceptReadiness(input: unknown): ReadinessSummary | null {
  if (input == null) return null;
  const row = record(input, "Readiness summary");
  if (row["contract"] !== READINESS_CONTRACT) {
    throw new ContractError(`Readiness contract must be ${READINESS_CONTRACT}.`);
  }
  if (!Array.isArray(row["items"])) throw new ContractError("Readiness items must be a list.");
  const source = row["source"];
  return {
    contract: READINESS_CONTRACT,
    student_id: text(row, "student_id"),
    summary_id: text(row, "summary_id"),
    items: row["items"].map((item, index) => readItem(item, index)),
    source: source === "stand-in" || source === "shared-db" ? source : "p06",
  };
}

function readItem(value: unknown, index: number): ReadinessItem {
  const row = record(value, `Readiness item ${index + 1}`);
  const outcome = row["review_outcome"];
  if (
    outcome !== "pending" &&
    outcome !== "revision_requested" &&
    outcome !== "demonstrated" &&
    outcome !== "not_demonstrated"
  ) {
    throw new ContractError(`Readiness item ${index + 1} has an unknown review outcome.`);
  }
  const reviewed = row["reviewed_at"];
  return {
    skill_id: text(row, "skill_id"),
    evidence_id: text(row, "evidence_id"),
    activity: text(row, "activity"),
    review_outcome: outcome,
    reviewer:
      typeof row["reviewer"] === "string" && row["reviewer"].trim() ? row["reviewer"].trim() : null,
    reviewed_at:
      typeof reviewed === "string" && reviewed.trim() ? day(reviewed.trim(), "Review date") : null,
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value.trim()) throw new ContractError(`${key} is required.`);
  return value.trim();
}

function whole(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new ContractError(`${key} must be a whole number, 1 or more.`);
  }
  return value;
}

function day(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ContractError(`${label} must be YYYY-MM-DD.`);
  return value;
}
