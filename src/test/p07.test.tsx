import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptPlacement,
  acceptReadiness,
  actionStatus,
  addAction,
  agree,
  closeAction,
  ContractError,
  history,
  judge,
  makeSeed,
  PLACEMENT,
  READINESS,
  requestFeedback,
  reviseLog,
  RuleError,
  saveAdvisor,
  saveEmployer,
  submitLog,
  TODAY,
} from "@/lib/p07";
import { apply, nextLogId, SANDBOX_STUDENT, validate, WriteRefused } from "@/lib/p07/write";

const LOG =
  "I traced one departure delay to a late baggage belt and kept the query with this note.";
const REVISION =
  "The late belt added 14 minutes. The network planning team used the dashboard the next morning.";
const FEEDBACK = "Name the delay in minutes and who used the dashboard.";

describe("P07 learning record", () => {
  it("traces one goal through a revision and an action, and leaves the other outcome missing", () => {
    let state = makeSeed();
    const untouched = structuredClone(state);
    state = agree({ ...state, actor: "student" }, state.drafts);
    expect(untouched.agreement).toBe("draft");
    state = submitLog({ ...state, actor: "student" }, "G-01", LOG, "EV-028-1");
    state = requestFeedback({ ...state, actor: "supervisor" }, "LOG-028-01", FEEDBACK);
    state = reviseLog({ ...state, actor: "student" }, "LOG-028-01", REVISION);
    const log = state.logs[0];
    expect(log?.versions[0]?.entry).toBe(LOG);
    expect(history(log!).map((row) => row.label)).toEqual(["Original", "Feedback", "Revision 2"]);

    state = judge({ ...state, actor: "advisor" }, "LO-ANA", "evidenced", "EV-028-1");
    state = judge({ ...state, actor: "advisor" }, "LO-REF", "missing", "");
    expect(() => judge(state, "LO-ANA", "evidenced", "E-JIRA-01")).toThrow(RuleError);
    expect(() => judge(state, "LO-ANA", "evidenced", "HM-028")).toThrow(/not on a log/);

    state = addAction(
      { ...state, actor: "advisor" },
      {
        goalId: "G-01",
        title: "Show the belt query to the network team",
        owner: "student",
        due: "2027-03-10",
      },
    );
    expect(actionStatus(state.actions[0]!, TODAY)).toBe("overdue");
    state = closeAction(
      { ...state, actor: "student" },
      "SA-028-02",
      "Walked Omar through the belt query on 20 Mar.",
    );
    expect(actionStatus(state.actions[0]!, TODAY)).toBe("completed");

    state = saveEmployer(
      { ...state, actor: "supervisor" },
      "Layla can explain a delay when she brings the query.",
    );
    state = saveAdvisor(
      { ...state, actor: "advisor" },
      "Analyse operations is evidenced. Reflect on practice is missing.",
      "Next period, present one finding without a second prompt.",
    );
    expect(state.finalReview.employer).not.toBe(state.finalReview.advisor);
    expect(state.finalReview.nextGoal).toContain("Next period");
    expect(state.reviews.find((review) => review.outcomeId === "LO-REF")?.judgement).toBe(
      "missing",
    );
  });

  it("refuses an unconfirmed placement and allows a missing readiness summary", () => {
    expect(acceptPlacement(PLACEMENT)).toEqual(PLACEMENT);
    expect(acceptReadiness(READINESS)).toEqual(READINESS);
    expect(acceptReadiness(null)).toBeNull();
    expect(() => acceptPlacement({ ...PLACEMENT, university_status: "offer" })).toThrow(
      ContractError,
    );
    expect(makeSeed(null).readiness).toBeNull();
    const agreed = agree(makeSeed(null), makeSeed(null).drafts);
    expect(submitLog(agreed, "G-01", LOG, "EV-028-1").logs).toHaveLength(1);
  });
});

const db = vi.hoisted(() => ({
  selectAll: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...db,
}));

const memory = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, String(value)),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() {
      return memory.size;
    },
  },
});

import { Learning } from "@/components/p07/Learning";
import { resetP07 } from "@/lib/p07";

describe("P07 page", () => {
  beforeEach(() => {
    memory.clear();
    resetP07();
    db.selectAll.mockImplementation(async (view: string) => {
      if (view === "placements") return [];
      if (view === "applications") return [{ application_id: "APP-028", status: "submitted" }];
      if (view === "skill_evidence") {
        return [{ evidence_id: "E-SQL-07", skill_id: "SK-SQL-01", review_outcome: "demonstrated" }];
      }
      return [];
    });
  });

  it("keeps the original, the feedback and the revision on the page", async () => {
    render(<Learning />);
    expect(await screen.findByText(/APP-028 is submitted/)).toBeInTheDocument();
    expect(screen.getByText("E-JIRA-01")).toBeInTheDocument();
    expect(screen.getByText("E-SQL-07")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agree" }));
    fireEvent.change(screen.getByLabelText("Entry"), { target: { value: LOG } });
    fireEvent.change(screen.getByLabelText("Evidence ID"), { target: { value: "EV-028-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit log" }));
    expect(screen.getByRole("heading", { name: "Original" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Omar Faris/ }));
    fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: FEEDBACK } });
    fireEvent.click(screen.getByRole("button", { name: "Request change" }));
    expect(screen.getByRole("heading", { name: "Feedback" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Layla Hassan/ }));
    fireEvent.change(screen.getByLabelText("Revision"), { target: { value: REVISION } });
    fireEvent.click(screen.getByRole("button", { name: "Submit revision" }));
    expect(screen.getByRole("heading", { name: "Revision 2" })).toBeInTheDocument();
    expect(screen.getByText(LOG)).toBeInTheDocument();
    expect(screen.getByText(REVISION)).toBeInTheDocument();
  });
});

describe("P07 shared write", () => {
  it("refuses the demo thread and posts a sandbox log", async () => {
    expect(() =>
      validate(
        {
          student_id: "COOP-B001",
          placement_id: "EG-DXB-028",
          period: "2027-SP",
          goal_id: "G-01",
          entry: LOG,
        },
        "all",
      ),
    ).toThrow(WriteRefused);
    expect(() => validate({ student_id: SANDBOX_STUDENT }, "off")).toThrow(/off/);
    const action = validate(
      {
        student_id: SANDBOX_STUDENT,
        placement_id: "EG-DXB-999",
        period: "2027-SP",
        goal_id: "G-01",
        entry: LOG,
        evidence_ids: ["EV-999-1"],
      },
      "sandbox",
    );
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      return {
        ok: true,
        status: method === "POST" ? 201 : 200,
        text: async () => (method === "GET" ? JSON.stringify([{ log_id: "LOG-9001" }]) : ""),
      } as Response;
    });
    const saved = await apply(action, fetchImpl as typeof fetch);
    expect(saved.log_id).toBe("LOG-9002");
    expect(nextLogId([])).toBe("LOG-9001");
    const post = fetchImpl.mock.calls.find((call) => call[1]?.method === "POST");
    expect(String(post?.[0])).toContain("/rest/v1/learning_logs");
    expect(JSON.parse(String(post?.[1]?.body)).placement_id).toBe("EG-DXB-999");
    expect((post?.[1]?.headers as Record<string, string>)["x-team-key"]).toBe("");
  });
});
