import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  actionStatus,
  addAction,
  agree,
  closeAction,
  history,
  judge,
  loadHandoff,
  requestFeedback,
  reviseLog,
  RuleError,
  saveAdvisor,
  saveEmployer,
  submitLog,
  TODAY,
  updateP07,
  useP07,
  type Handoff,
  type Role,
  type State,
} from "@/lib/p07";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const ROLES: { id: Role; label: string }[] = [
  { id: "student", label: "Student · Layla Hassan" },
  { id: "supervisor", label: "Supervisor · Omar Faris" },
  { id: "advisor", label: "Advisor · Hana Al Hashimi" },
];

export function Learning() {
  const state = useP07();
  if (!state) return <p role="status">Loading.</p>;
  const key = [
    state.agreement,
    state.logs.length,
    state.reviews.length,
    state.actions.length,
    state.finalReview.employer ?? "",
    state.finalReview.advisor ?? "",
  ].join(":");
  return <Screen key={key} state={state} />;
}

function Screen({ state }: { state: State }) {
  const [error, setError] = useState<string | null>(null);
  const handoff = useHandoff();
  const writeLabel = useWriteLabel();
  const run = (rule: (current: State) => State) => {
    try {
      updateP07(rule);
      setError(null);
    } catch (caught) {
      if (caught instanceof RuleError) setError(caught.message);
      else throw caught;
    }
  };
  const setActor = (actor: Role) => {
    updateP07((current) => ({ ...current, actor }));
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Role">
        {ROLES.map((role) => (
          <Button
            key={role.id}
            type="button"
            size="sm"
            variant={state.actor === role.id ? "default" : "outline"}
            aria-pressed={state.actor === role.id}
            onClick={() => setActor(role.id)}
          >
            {role.label}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      ) : null}
      <Placement state={state} handoff={handoff} writeLabel={writeLabel} />
      <Agreement state={state} run={run} />
      {state.agreement === "agreed" ? (
        <>
          <Logbook state={state} run={run} />
          <Progress state={state} run={run} />
          <Actions state={state} run={run} />
          <Final state={state} run={run} />
        </>
      ) : null}
    </div>
  );
}

function Placement({
  state,
  handoff,
  writeLabel,
}: {
  state: State;
  handoff: Handoff | null;
  writeLabel: string;
}) {
  const rows =
    handoff?.readiness ??
    (state.readiness?.items ?? []).map((item) => ({ ...item, source: "stand-in" as const }));
  const source = handoff?.placementSource ?? "stand-in";
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg font-semibold text-heading">Placement</h2>
        <Mark tone={source === "shared-db" ? "sent" : "warn"}>
          {source === "shared-db" ? "Shared database" : "Stand-in"}
        </Mark>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Placement" value={state.placement.placement_id} />
          <Fact label="Student" value={state.placement.student_id} />
          <Fact label="Role" value={`${state.placement.title}, ${state.placement.employer_name}`} />
          <Fact label="City" value={state.placement.city} />
          <Fact label="Application" value={state.placement.application_id} />
          <Fact
            label="Opportunity"
            value={`${state.placement.opportunity_id} v${state.placement.opportunity_version}`}
          />
          <Fact label="Supervisor" value={state.placement.supervisor_name} />
          <Fact
            label="Dates"
            value={`${day(state.placement.start_date)} – ${day(state.placement.end_date)}`}
          />
          <Fact label="Confirmed by" value={state.placement.confirmed_by} />
          <Fact label="Page date" value={day(TODAY)} />
        </dl>
        <p className="text-muted-foreground">{handoff?.note ?? "Checking the shared database."}</p>
        <p className="text-muted-foreground">{writeLabel}</p>
        <div className="space-y-2">
          <h3 className="font-medium text-heading">Readiness</h3>
          {rows.length ? (
            rows.map((item) => (
              <div key={`${item.source}-${item.evidence_id}`}>
                <Mark tone={item.source === "shared-db" ? "sent" : "warn"}>
                  {item.source === "shared-db" ? "Shared database" : "Stand-in"}
                </Mark>{" "}
                <span className="font-mono text-xs">{item.evidence_id}</span> {item.skill_id} ·{" "}
                {item.review_outcome}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">None.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Agreement({ state, run }: { state: State; run: Run }) {
  const [drafts, setDrafts] = useState(state.drafts);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <h2 className="text-lg font-semibold text-heading">Agreement</h2>
        <Mark tone={state.agreement === "agreed" ? "ok" : "muted"}>
          {state.agreement === "agreed" ? "Agreed" : "Draft"}
        </Mark>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.agreement === "agreed" ? (
          <ul className="space-y-2 text-sm">
            {state.goals.map((goal) => (
              <li key={goal.id}>
                <span className="font-mono text-xs text-muted-foreground">{goal.id}</span>{" "}
                <span className="font-medium">{outcomeTitle(state, goal.outcomeId)}</span>
                <p>{goal.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              run((current) => agree(current, drafts));
            }}
          >
            {drafts.map((draft, index) => (
              <div key={draft.outcomeId} className="space-y-2">
                <Field
                  id={`goal-${index}`}
                  label={`Goal ${index + 1} · ${outcomeTitle(state, draft.outcomeId)}`}
                >
                  <Textarea
                    id={`goal-${index}`}
                    value={draft.text}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            ))}
            {state.actor === "student" ? (
              <Button type="submit">Agree</Button>
            ) : (
              <p className="text-sm text-muted-foreground">Only the student can agree.</p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Logbook({ state, run }: { state: State; run: Run }) {
  const [goalId, setGoalId] = useState(state.goals[0]?.id ?? "");
  const [entry, setEntry] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-heading">Log</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.logs.map((log) => (
          <article key={log.id} className="space-y-2 rounded-md border p-3 text-sm">
            <p className="font-medium">
              <span className="font-mono text-xs">{log.id}</span> · {log.goalId}
            </p>
            {history(log).map((row, index) => (
              <div key={`${row.label}-${index}`}>
                <h3 className="font-medium text-heading">{row.label}</h3>
                <p>{row.text}</p>
              </div>
            ))}
            {state.actor === "supervisor" && log.status !== "feedback_requested" ? (
              <FeedbackForm logId={log.id} run={run} />
            ) : null}
            {state.actor === "student" && log.status === "feedback_requested" ? (
              <RevisionForm logId={log.id} run={run} />
            ) : null}
          </article>
        ))}
        {state.actor === "student" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              run((current) => submitLog(current, goalId, entry, evidenceId));
            }}
          >
            <Field id="log-goal" label="Goal">
              <select
                id="log-goal"
                className={selectCls}
                value={goalId}
                onChange={(event) => setGoalId(event.target.value)}
              >
                {state.goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.id} · {outcomeTitle(state, goal.outcomeId)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="log-entry" label="Entry">
              <Textarea
                id="log-entry"
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
              />
            </Field>
            <Field id="log-evidence" label="Evidence ID">
              <Input
                id="log-evidence"
                value={evidenceId}
                placeholder="EV-028-1"
                onChange={(event) => setEvidenceId(event.target.value)}
              />
            </Field>
            <Button type="submit">Submit log</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Progress({ state, run }: { state: State; run: Run }) {
  const [outcomeId, setOutcomeId] = useState(state.outcomes[0]?.id ?? "");
  const [mode, setMode] = useState<"evidenced" | "missing">("evidenced");
  const [evidenceId, setEvidenceId] = useState("");
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-heading">Progress</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {state.outcomes.map((outcome) => {
            const review = state.reviews.find((item) => item.outcomeId === outcome.id);
            const evidence = evidenceFor(state, outcome.id);
            return (
              <li key={outcome.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{outcome.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{outcome.id}</span>
                  <Mark
                    tone={
                      review?.judgement === "evidenced"
                        ? "ok"
                        : review?.judgement === "missing"
                          ? "warn"
                          : "muted"
                    }
                  >
                    {review?.judgement === "evidenced"
                      ? "Evidenced"
                      : review?.judgement === "missing"
                        ? "Missing"
                        : "Not reviewed"}
                  </Mark>
                </div>
                <p className="text-muted-foreground">
                  {evidence.length ? evidence.join(", ") : "No log evidence."}
                  {review?.evidenceId ? ` · cites ${review.evidenceId}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
        {state.actor === "advisor" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              run((current) =>
                judge(current, outcomeId, mode, mode === "missing" ? "" : evidenceId),
              );
            }}
          >
            <Field id="judge-outcome" label="Outcome">
              <select
                id="judge-outcome"
                className={selectCls}
                value={outcomeId}
                onChange={(event) => setOutcomeId(event.target.value)}
              >
                {state.outcomes.map((outcome) => (
                  <option key={outcome.id} value={outcome.id}>
                    {outcome.title}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="space-y-1 text-sm">
              <legend className="font-medium">Judgement</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "evidenced"}
                  onChange={() => setMode("evidenced")}
                />
                Evidenced
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "missing"}
                  onChange={() => setMode("missing")}
                />
                Missing
              </label>
            </fieldset>
            {mode === "evidenced" ? (
              <Field id="judge-evidence" label="Cites">
                <Input
                  id="judge-evidence"
                  value={evidenceId}
                  onChange={(event) => setEvidenceId(event.target.value)}
                />
              </Field>
            ) : null}
            <Button type="submit">Save judgement</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Only the advisor can judge.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Actions({ state, run }: { state: State; run: Run }) {
  const [goalId, setGoalId] = useState(state.goals[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<Role>("student");
  const [due, setDue] = useState("2027-03-10");
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-heading">Midpoint action</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {state.actions.map((action) => {
            const status = actionStatus(action);
            return (
              <li key={action.id} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{action.id}</span>
                  <Mark
                    tone={status === "completed" ? "ok" : status === "overdue" ? "bad" : "warn"}
                  >
                    {status === "completed"
                      ? "Completed"
                      : status === "overdue"
                        ? "Overdue"
                        : "Open"}
                  </Mark>
                </div>
                <p>{action.title}</p>
                <p className="text-muted-foreground">
                  {action.owner} · due {day(action.due)} · {action.goalId}
                </p>
                {action.closure ? (
                  <p>Closure: {action.closure}</p>
                ) : (
                  <CloseForm
                    actionId={action.id}
                    owner={action.owner}
                    actor={state.actor}
                    run={run}
                  />
                )}
              </li>
            );
          })}
        </ul>
        {state.actor === "advisor" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              run((current) => addAction(current, { goalId, title, owner, due }));
            }}
          >
            <Field id="action-title" label="Action">
              <Input
                id="action-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="action-goal" label="Goal">
                <select
                  id="action-goal"
                  className={selectCls}
                  value={goalId}
                  onChange={(event) => setGoalId(event.target.value)}
                >
                  {state.goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="action-owner" label="Owner">
                <select
                  id="action-owner"
                  className={selectCls}
                  value={owner}
                  onChange={(event) => setOwner(event.target.value as Role)}
                >
                  <option value="student">Student</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="advisor">Advisor</option>
                </select>
              </Field>
              <Field id="action-due" label="Due">
                <Input
                  id="action-due"
                  type="date"
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                />
              </Field>
            </div>
            <Button type="submit">Add action</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Final({ state, run }: { state: State; run: Run }) {
  const [employer, setEmployer] = useState(state.finalReview.employer ?? "");
  const [advisor, setAdvisor] = useState(state.finalReview.advisor ?? "");
  const [nextGoal, setNextGoal] = useState(state.finalReview.nextGoal ?? "");
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg font-semibold text-heading">Final review</h2>
        <span className="font-mono text-xs text-muted-foreground">{state.period.id}</span>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            run((current) => saveEmployer(current, employer));
          }}
        >
          <h3 className="font-medium text-heading">Employer feedback</h3>
          {state.finalReview.employer ? (
            <p className="text-sm">{state.finalReview.employer}</p>
          ) : null}
          {state.actor === "supervisor" ? (
            <>
              <Field id="employer-feedback" label="Comment">
                <Textarea
                  id="employer-feedback"
                  value={employer}
                  onChange={(event) => setEmployer(event.target.value)}
                />
              </Field>
              <Button type="submit">Save employer feedback</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only the supervisor can write this.</p>
          )}
        </form>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            run((current) => saveAdvisor(current, advisor, nextGoal));
          }}
        >
          <h3 className="font-medium text-heading">Academic judgement</h3>
          {state.finalReview.advisor ? (
            <p className="text-sm">{state.finalReview.advisor}</p>
          ) : null}
          {state.finalReview.nextGoal ? (
            <div className="text-sm">
              <Mark tone="muted">Not started</Mark> {state.finalReview.nextGoal}
            </div>
          ) : null}
          {state.actor === "advisor" ? (
            <>
              <Field id="advisor-judgement" label="Judgement">
                <Textarea
                  id="advisor-judgement"
                  value={advisor}
                  onChange={(event) => setAdvisor(event.target.value)}
                />
              </Field>
              <Field id="next-goal" label="Next-period goal">
                <Textarea
                  id="next-goal"
                  value={nextGoal}
                  onChange={(event) => setNextGoal(event.target.value)}
                />
              </Field>
              <Button type="submit">Save academic judgement</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only the advisor can write this.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function FeedbackForm({ logId, run }: { logId: string; run: Run }) {
  const [text, setText] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run((current) => requestFeedback(current, logId, text));
      }}
    >
      <Field id={`feedback-${logId}`} label="Feedback">
        <Textarea
          id={`feedback-${logId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Button type="submit" size="sm">
        Request change
      </Button>
    </form>
  );
}

function RevisionForm({ logId, run }: { logId: string; run: Run }) {
  const [text, setText] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run((current) => reviseLog(current, logId, text));
      }}
    >
      <Field id={`revision-${logId}`} label="Revision">
        <Textarea
          id={`revision-${logId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Button type="submit" size="sm">
        Submit revision
      </Button>
    </form>
  );
}

function CloseForm({
  actionId,
  owner,
  actor,
  run,
}: {
  actionId: string;
  owner: Role;
  actor: Role;
  run: Run;
}) {
  const [closure, setClosure] = useState("");
  if (actor !== owner && actor !== "advisor") return null;
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run((current) => closeAction(current, actionId, closure));
      }}
    >
      <Field id={`close-${actionId}`} label="Closure">
        <Input
          id={`close-${actionId}`}
          value={closure}
          onChange={(event) => setClosure(event.target.value)}
        />
      </Field>
      <Button type="submit" size="sm">
        Close
      </Button>
    </form>
  );
}

type Run = (rule: (state: State) => State) => void;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Mark({
  children,
  tone,
}: {
  children: string;
  tone: "warn" | "ok" | "bad" | "muted" | "sent";
}) {
  const cls = {
    warn: "border-transparent bg-warn text-warn-foreground",
    ok: "border-transparent bg-status text-status-foreground",
    bad: "border-transparent bg-danger text-danger-foreground",
    muted: "border-transparent bg-muted text-muted-foreground",
    sent: "border-transparent bg-sent text-sent-foreground",
  }[tone];
  return <Badge className={cls}>{children}</Badge>;
}

function outcomeTitle(state: State, id: string): string {
  return state.outcomes.find((outcome) => outcome.id === id)?.title ?? id;
}

function evidenceFor(state: State, outcomeId: string): string[] {
  const ids = new Set<string>();
  for (const log of state.logs) {
    const goal = state.goals.find((item) => item.id === log.goalId);
    if (goal?.outcomeId !== outcomeId) continue;
    for (const version of log.versions) {
      if (version.evidenceId) ids.add(version.evidenceId);
    }
  }
  return [...ids];
}

function day(iso: string): string {
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function useHandoff(): Handoff | null {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  useEffect(() => {
    let on = true;
    loadHandoff().then((next) => {
      if (on) setHandoff(next);
    });
    return () => {
      on = false;
    };
  }, []);
  return handoff;
}

function useWriteLabel(): string {
  const [label, setLabel] = useState("Shared write: off");
  useEffect(() => {
    let on = true;
    fetch("/api/p07/log")
      .then((response) => response.json())
      .then((body: { enabled?: boolean; scope?: string }) => {
        if (!on) return;
        setLabel(body.enabled ? `Shared write: ${body.scope ?? "on"}` : "Shared write: off");
      })
      .catch(() => {
        if (on) setLabel("Shared write: off");
      });
    return () => {
      on = false;
    };
  }, []);
  return label;
}
