import { AT, TODAY } from "./seed";
import type { DraftGoal, LogEntry, Role, State, SupportAction } from "./types";

type Judgement = "evidenced" | "missing";

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

export type ActionStatus = "open" | "overdue" | "completed";

export function actionStatus(action: SupportAction, today = TODAY): ActionStatus {
  if (action.closedOn) return "completed";
  if (action.due < today) return "overdue";
  return "open";
}

export function history(log: LogEntry): { label: string; text: string }[] {
  const rows: { label: string; text: string }[] = [];
  for (const version of log.versions) {
    rows.push({
      label: version.version === 1 ? "Original" : `Revision ${version.version}`,
      text: version.entry,
    });
    for (const note of log.feedback) {
      if (note.onVersion === version.version) rows.push({ label: "Feedback", text: note.text });
    }
  }
  return rows;
}

export function agree(state: State, drafts: DraftGoal[]): State {
  const next = clone(state);
  if (next.actor !== "student") throw new RuleError("Only the student can agree.");
  if (next.agreement === "agreed") throw new RuleError("The agreement is already agreed.");
  if (drafts.length !== next.outcomes.length) {
    throw new RuleError("Add one goal for each outcome.");
  }
  const seen = new Set<string>();
  next.goals = drafts.map((draft, index) => {
    const outcomeId = draft.outcomeId.trim();
    const text = draft.text.trim();
    if (!next.outcomes.some((outcome) => outcome.id === outcomeId)) {
      throw new RuleError("Each goal must use an outcome from the list.");
    }
    if (seen.has(outcomeId)) throw new RuleError("Use each outcome once.");
    seen.add(outcomeId);
    if (text.length < 20) throw new RuleError(`Goal ${index + 1} is too short.`);
    return { id: `G-0${index + 1}`, outcomeId, text };
  });
  next.drafts = next.goals.map((goal) => ({ outcomeId: goal.outcomeId, text: goal.text }));
  next.agreement = "agreed";
  return next;
}

export function submitLog(state: State, goalId: string, entry: string, evidenceId: string): State {
  const next = clone(state);
  if (next.actor !== "student") throw new RuleError("Only the student can submit a log.");
  requireAgreed(next);
  requireGoal(next, goalId);
  const body = paragraph(entry, 40);
  const evidence = cleanEvidence(evidenceId);
  next.seq += 1;
  next.logs.push({
    id: `LOG-028-${String(next.seq).padStart(2, "0")}`,
    goalId,
    status: "submitted",
    versions: [{ version: 1, entry: body, evidenceId: evidence, at: AT }],
    feedback: [],
  });
  return next;
}

export function requestFeedback(state: State, logId: string, text: string): State {
  const next = clone(state);
  if (next.actor !== "supervisor") throw new RuleError("Only the supervisor can request a change.");
  const log = requireLog(next, logId);
  if (log.status === "feedback_requested")
    throw new RuleError("This log is already waiting for a revision.");
  const body = paragraph(text, 24);
  const version = log.versions[log.versions.length - 1];
  if (!version) throw new RuleError("This log has no entry.");
  log.feedback.push({ onVersion: version.version, text: body, at: AT });
  log.status = "feedback_requested";
  return next;
}

export function reviseLog(state: State, logId: string, entry: string): State {
  const next = clone(state);
  if (next.actor !== "student") throw new RuleError("Only the student can revise a log.");
  const log = requireLog(next, logId);
  if (log.status !== "feedback_requested")
    throw new RuleError("Wait for feedback before revising.");
  const body = paragraph(entry, 40);
  const current = log.versions[log.versions.length - 1];
  if (!current) throw new RuleError("This log has no entry.");
  if (body === current.entry)
    throw new RuleError("The revision must differ from the current entry.");
  log.versions.push({
    version: current.version + 1,
    entry: body,
    evidenceId: current.evidenceId,
    at: AT,
  });
  log.status = "revised";
  return next;
}

export function judge(
  state: State,
  outcomeId: string,
  judgement: Judgement,
  evidenceId: string,
): State {
  const next = clone(state);
  if (next.actor !== "advisor") throw new RuleError("Only the advisor can judge an outcome.");
  requireAgreed(next);
  if (!next.outcomes.some((outcome) => outcome.id === outcomeId)) {
    throw new RuleError("Unknown outcome.");
  }
  const id = evidenceId.trim();
  if (judgement === "missing") {
    if (id) throw new RuleError("Mark missing with no evidence id.");
  } else if (!cited(next, outcomeId, id)) {
    throw new RuleError("That evidence is not on a log for this outcome.");
  }
  const review = {
    outcomeId,
    judgement,
    evidenceId: judgement === "evidenced" ? id : null,
  };
  next.reviews = [...next.reviews.filter((item) => item.outcomeId !== outcomeId), review];
  return next;
}

export function addAction(
  state: State,
  input: { goalId: string; title: string; owner: Role; due: string },
): State {
  const next = clone(state);
  if (next.actor !== "advisor") throw new RuleError("Only the advisor can add an action.");
  requireAgreed(next);
  requireGoal(next, input.goalId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new RuleError("Due date must be YYYY-MM-DD.");
  if (input.due < next.period.start || input.due > next.period.end) {
    throw new RuleError("Due date must be inside this period.");
  }
  const title = input.title.trim();
  if (title.length < 10) throw new RuleError("Action is too short.");
  next.seq += 1;
  next.actions.push({
    id: `SA-028-${String(next.seq).padStart(2, "0")}`,
    goalId: input.goalId,
    title,
    owner: input.owner,
    due: input.due,
    closure: null,
    closedOn: null,
  });
  return next;
}

export function closeAction(state: State, actionId: string, closure: string): State {
  const next = clone(state);
  const action = next.actions.find((item) => item.id === actionId);
  if (!action) throw new RuleError("Unknown action.");
  if (next.actor !== "advisor" && next.actor !== action.owner) {
    throw new RuleError("Only the owner or the advisor can close this.");
  }
  if (action.closedOn) throw new RuleError("Already closed.");
  const note = closure.trim();
  if (note.length < 10) throw new RuleError("Add closure evidence.");
  action.closure = note;
  action.closedOn = TODAY;
  return next;
}

export function saveEmployer(state: State, text: string): State {
  const next = clone(state);
  if (next.actor !== "supervisor")
    throw new RuleError("Only the supervisor can save employer feedback.");
  requireAgreed(next);
  next.finalReview.employer = paragraph(text, 20);
  return next;
}

export function saveAdvisor(state: State, judgement: string, nextGoal: string): State {
  const next = clone(state);
  if (next.actor !== "advisor") throw new RuleError("Only the advisor can save the judgement.");
  requireAgreed(next);
  const open = next.outcomes.filter(
    (outcome) => !next.reviews.some((review) => review.outcomeId === outcome.id),
  );
  if (open.length) throw new RuleError("Judge every outcome first.");
  const written = paragraph(judgement, 20);
  const employer = next.finalReview.employer?.trim().toLowerCase();
  if (employer && employer === written.toLowerCase()) {
    throw new RuleError("The judgement must differ from the employer feedback.");
  }
  const goal = nextGoal.trim();
  if (goal.length < 10) throw new RuleError("Next-period goal is too short.");
  next.finalReview.advisor = written;
  next.finalReview.nextGoal = goal;
  return next;
}

function clone(state: State): State {
  return structuredClone(state);
}

function requireAgreed(state: State) {
  if (state.agreement !== "agreed") throw new RuleError("Agree the goals first.");
}

function requireGoal(state: State, goalId: string) {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal) throw new RuleError("Unknown goal.");
  return goal;
}

function requireLog(state: State, logId: string): LogEntry {
  const log = state.logs.find((item) => item.id === logId);
  if (!log) throw new RuleError("Unknown log.");
  return log;
}

function paragraph(value: string, min: number): string {
  const text = value.trim();
  if (text.length < min) throw new RuleError(`Use at least ${min} characters.`);
  return text;
}

function cleanEvidence(value: string): string | null {
  const id = value.trim();
  if (!id) return null;
  if (!/^EV-[A-Z0-9-]+$/.test(id)) throw new RuleError("Log evidence ids start with EV-.");
  return id;
}

function cited(state: State, outcomeId: string, evidenceId: string): boolean {
  if (!evidenceId) return false;
  return state.logs.some((log) => {
    const goal = state.goals.find((item) => item.id === log.goalId);
    return (
      goal?.outcomeId === outcomeId &&
      log.versions.some((version) => version.evidenceId === evidenceId)
    );
  });
}
