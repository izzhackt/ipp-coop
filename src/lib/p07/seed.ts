import {
  acceptPlacement,
  acceptReadiness,
  PLACEMENT_CONTRACT,
  READINESS_CONTRACT,
} from "./contract";
import type { ReadinessSummary } from "./contract";
import type { State } from "./types";

export const TODAY = "2027-03-24";
export const AT = `${TODAY}T09:00:00.000Z`;

export const PLACEMENT = acceptPlacement({
  contract: PLACEMENT_CONTRACT,
  placement_id: "EG-DXB-028",
  student_id: "COOP-B001",
  application_id: "APP-028",
  opportunity_id: "OP-028",
  opportunity_version: 2,
  profile_version: 3,
  employer_name: "Emirates Group",
  title: "Aviation Analytics Intern",
  city: "Dubai",
  supervisor_name: "Omar Faris",
  start_date: "2027-02-01",
  end_date: "2027-05-31",
  confirmed_by: "Co-op office: N. Al Mansoori (synthetic)",
  confirmed_at: "2026-08-20T09:00:00.000Z",
  university_status: "confirmed",
  source: "stand-in",
});

const readiness = acceptReadiness({
  contract: READINESS_CONTRACT,
  student_id: "COOP-B001",
  summary_id: "RDY-B001",
  source: "stand-in",
  items: [
    {
      skill_id: "SK-JIRA-01",
      evidence_id: "E-JIRA-01",
      activity: "Jira preparation: create a work item, set an assignee, explain a status change.",
      review_outcome: "demonstrated",
      reviewer: "P06 reviewer (synthetic)",
      reviewed_at: "2026-08-28",
    },
  ],
});
if (!readiness) throw new Error("P07 readiness stand-in is empty.");
export const READINESS: ReadinessSummary = readiness;

export function makeSeed(readiness: ReadinessSummary | null = READINESS): State {
  return {
    actor: "student",
    placement: PLACEMENT,
    readiness,
    outcomes: [
      { id: "LO-ANA", title: "Analyse operations" },
      { id: "LO-REF", title: "Reflect on practice" },
    ],
    period: { id: "2027-SP", start: PLACEMENT.start_date, end: PLACEMENT.end_date },
    agreement: "draft",
    drafts: [
      {
        outcomeId: "LO-ANA",
        text: "Explain one cause of a departure delay and keep the query with the note.",
      },
      {
        outcomeId: "LO-REF",
        text: "Name one change for the next period, separate from this period's result.",
      },
    ],
    goals: [],
    logs: [],
    reviews: [],
    actions: [],
    finalReview: { employer: null, advisor: null, nextGoal: null },
    seq: 0,
  };
}
