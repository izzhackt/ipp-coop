import { dbConfig } from "@/lib/db";

const PROTECTED = new Set([
  "COOP-B001",
  "COOP-B002",
  "COOP-B003",
  "COOP-B004",
  "COOP-B005",
  "COOP-B006",
]);
export const SANDBOX_STUDENT = "COOP-Z001";

export class WriteRefused extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "WriteRefused";
  }
}

export interface LogWrite {
  student_id: string;
  placement_id: string;
  period: string;
  goal_id: string;
  entry: string;
  evidence_ids: string[];
}

type Scope = "off" | "sandbox" | "all";

const env = (name: string): string | undefined => {
  const injected = (globalThis as { __IPP_ENV?: Record<string, string> }).__IPP_ENV?.[name];
  if (injected) return injected;
  try {
    return typeof process !== "undefined" ? process.env?.[name]?.trim() || undefined : undefined;
  } catch {
    return undefined;
  }
};

export function writeStatus(): { enabled: boolean; scope: Scope } {
  const key = env("P07_TEAM_KEY");
  const scope: Scope = !key ? "off" : env("P07_WRITE_SCOPE") === "all" ? "all" : "sandbox";
  return { enabled: Boolean(key), scope };
}

export function validate(body: unknown, scope: Scope): LogWrite {
  if (scope === "off") throw new WriteRefused("Shared-database writes are off.", 503);
  const row = (body ?? {}) as Record<string, unknown>;
  const student = text(row, "student_id");
  if (PROTECTED.has(student)) {
    throw new WriteRefused(
      `${student} is part of the protected demo thread. Use ${SANDBOX_STUDENT}.`,
      403,
    );
  }
  if (scope === "sandbox" && student !== SANDBOX_STUDENT) {
    throw new WriteRefused(`This site only writes for ${SANDBOX_STUDENT}.`, 403);
  }
  const evidence = Array.isArray(row["evidence_ids"]) ? row["evidence_ids"].map(String) : [];
  if (evidence.some((id) => !/^EV-[A-Z0-9-]+$/.test(id))) {
    throw new WriteRefused("Log evidence ids start with EV-.");
  }
  return {
    student_id: student,
    placement_id: text(row, "placement_id"),
    period: text(row, "period").slice(0, 40),
    goal_id: text(row, "goal_id"),
    entry: text(row, "entry").slice(0, 1200),
    evidence_ids: evidence.slice(0, 8),
  };
}

export function nextLogId(ids: string[]): string {
  let max = 9000;
  for (const id of ids) {
    const n = Number(/^LOG-(\d{4})$/.exec(id)?.[1] ?? 0);
    if (n >= 9000) max = Math.max(max, n);
  }
  return `LOG-${String(max + 1).padStart(4, "0")}`;
}

type Fetch = typeof fetch;

export async function apply(
  action: LogWrite,
  f: Fetch = fetch,
): Promise<{ log_id: string; message: string }> {
  const existing = (await call(
    "learning_logs?select=log_id&log_id=gte.LOG-9000&order=log_id.desc&limit=20",
    { method: "GET" },
    f,
  )) as { log_id: string }[];
  const log_id = nextLogId(existing.map((row) => row.log_id));
  await call(
    "learning_logs",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        log_id,
        placement_id: action.placement_id,
        period: action.period,
        goal_id: action.goal_id,
        entry: action.entry,
        evidence_ids: action.evidence_ids,
        feedback: null,
        review_status: "submitted",
      }),
    },
    f,
  );
  return { log_id, message: `${log_id} saved for ${action.student_id}.` };
}

async function call(path: string, init: RequestInit, f: Fetch): Promise<unknown> {
  const { url, key } = dbConfig();
  const response = await f(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      "x-team-key": env("P07_TEAM_KEY") ?? "",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const raw = await response.text();
  const body = raw ? (JSON.parse(raw) as unknown) : null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new WriteRefused(`Shared database: ${message}`, response.status === 401 ? 403 : 502);
  }
  return body;
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value.trim()) throw new WriteRefused(`${key} is required.`);
  return value.trim();
}
