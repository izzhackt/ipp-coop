import { eq, selectAll, type DbOptions } from "@/lib/db";
import type { ReadinessItem, ReviewOutcome } from "./contract";
import { PLACEMENT, READINESS } from "./seed";

export interface ShownReadiness {
  evidence_id: string;
  skill_id: string;
  review_outcome: string;
  source: "stand-in" | "shared-db";
}

export interface Handoff {
  placementSource: "stand-in" | "shared-db";
  note: string;
  readiness: ShownReadiness[];
}

interface PlacementRow {
  placement_id: string;
  confirmed_by: string;
}

interface ApplicationRow {
  application_id: string;
  status: string;
}

interface EvidenceRow {
  evidence_id: string;
  skill_id: string;
  review_outcome: string;
}

const OUTCOMES: readonly ReviewOutcome[] = [
  "pending",
  "revision_requested",
  "demonstrated",
  "not_demonstrated",
];

export async function loadHandoff(opts?: DbOptions): Promise<Handoff> {
  try {
    const [placements, applications, evidence] = await Promise.all([
      selectAll<PlacementRow>(
        "placements",
        {
          select: "placement_id,confirmed_by",
          student_id: eq(PLACEMENT.student_id),
          placement_id: eq(PLACEMENT.placement_id),
        },
        opts,
      ),
      selectAll<ApplicationRow>(
        "applications",
        {
          select: "application_id,status",
          student_id: eq(PLACEMENT.student_id),
          application_id: eq(PLACEMENT.application_id),
        },
        opts,
      ),
      selectAll<EvidenceRow>(
        "skill_evidence",
        {
          select: "evidence_id,skill_id,review_outcome",
          student_id: eq(PLACEMENT.student_id),
          order: "evidence_id",
        },
        opts,
      ),
    ]);
    return assemble(placements[0], applications[0], evidence);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "The shared database did not answer.";
    return { ...fixture(evidenceOf(READINESS.items)), note: message };
  }
}

export function assemble(
  placement: PlacementRow | undefined,
  application: ApplicationRow | undefined,
  evidence: EvidenceRow[],
): Handoff {
  const readiness = mergeReadiness(evidence);
  if (placement) {
    return {
      placementSource: "shared-db",
      note: `${placement.placement_id} is in the shared placements table, confirmed by ${placement.confirmed_by}.`,
      readiness,
    };
  }
  const status = application?.status ? application.status.replaceAll("_", " ") : "not listed";
  return {
    ...fixture(readiness),
    note: `No placement row for ${PLACEMENT.student_id}. ${PLACEMENT.application_id} is ${status}.`,
  };
}

function fixture(readiness: ShownReadiness[]): Handoff {
  return { placementSource: "stand-in", note: "", readiness };
}

function mergeReadiness(evidence: EvidenceRow[]): ShownReadiness[] {
  const live: ShownReadiness[] = [];
  for (const row of evidence) {
    if (!isOutcome(row.review_outcome)) continue;
    live.push({
      evidence_id: row.evidence_id,
      skill_id: row.skill_id,
      review_outcome: row.review_outcome,
      source: "shared-db",
    });
  }
  const seen = new Set(live.map((item) => item.evidence_id));
  const standIn = evidenceOf(READINESS.items).filter((item) => !seen.has(item.evidence_id));
  return [...live, ...standIn];
}

function evidenceOf(items: ReadinessItem[]): ShownReadiness[] {
  return items.map((item) => ({
    evidence_id: item.evidence_id,
    skill_id: item.skill_id,
    review_outcome: item.review_outcome,
    source: "stand-in" as const,
  }));
}

function isOutcome(value: string): value is ReviewOutcome {
  return (OUTCOMES as readonly string[]).includes(value);
}
