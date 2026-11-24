import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { GraduationCap, Menu, RotateCcw, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { resetDemo } from "@/lib/ipp-store";
import { Assistant } from "@/components/p02/Assistant";
import { resetP01 } from "@/lib/p01";
import { commit, resetLaunchpad, useLaunchpad, viewForPath, type View } from "@/lib/p02/store";

/*
 * App frame copied from Team 2's Launchpad (agreed UI base, 23 Nov 2026): brand, the current view's pages,
 * a "Team Modules" menu, VIEW AS Student | Employer | Admin, the page, then the footer. The view lives in
 * the Launchpad store (src/lib/p02/store.ts); pages for another view show a "… only" notice, as on Launchpad.
 * Other teams' own pages (/p03, /p05/coordinator, /desk, /matches, /faq) still work by URL.
 */

type NavItem = { to: string; label: string };

const NAV: Record<View, NavItem[]> = {
  student: [
    { to: "/profile", label: "Profile" },
    { to: "/opportunities", label: "Opportunities" },
    { to: "/applications", label: "My Applications" },
    { to: "/desk", label: "Internship Desk" },
  ],
  employer: [
    { to: "/employer", label: "Dashboard" },
    { to: "/employer/listings", label: "My Listings" },
    { to: "/employer/applicants", label: "Applicants" },
    { to: "/employer/post", label: "Post Opportunity" },
  ],
  admin: [
    { to: "/admin", label: "Admin Review" },
    { to: "/admin/ai-logs", label: "AI Review Log" },
    { to: "/admin/desk", label: "Desk queue" },
    { to: "/p03/shared", label: "Shared queue" },
    { to: "/p05/coordinator", label: "Match checks" },
  ],
};

// Earlier team pages, kept reachable from the footer without changing Group 2's menus.
const TEAM_PAGES = [
  { to: "/p01/profile", label: "Internship interests (Team 1)" },
  { to: "/p01/coordinator", label: "Profile review (Team 1)" },
  { to: "/faq", label: "Approved FAQ (Team 1)" },
  { to: "/student", label: "Student record (Team 1)" },
  { to: "/faculty", label: "Faculty view (Team 1)" },
  { to: "/matches", label: "Matches (Team 5)" },
  { to: "/p03", label: "Review and publication (Team 3)" },
  { to: "/p07", label: "Co-op learning (Team 7)" },
] as const;

const VIEWS: { id: View; label: string; home: string }[] = [
  { id: "student", label: "Student", home: "/opportunities" },
  { id: "employer", label: "Employer", home: "/employer" },
  { id: "admin", label: "Admin", home: "/admin" },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const lp = useLaunchpad();
  const fromPath = viewForPath(path);
  const view: View = fromPath ?? lp?.view ?? "student";
  // Keep the stored view in step with the page, so shared pages remember the last view used.
  useEffect(() => {
    if (lp && fromPath && lp.view !== fromPath) commit((s) => ({ ...s, view: fromPath }));
  }, [lp, fromPath]);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    setMenu(false);
  }, [path]);

  const isActive = (to: string) =>
    to === "/employer" || to === "/admin" ? path === to : path === to || path.startsWith(`${to}/`);
  const switchView = (v: (typeof VIEWS)[number]) => {
    commit((s) => ({ ...s, view: v.id }));
    void navigate({ to: v.home });
  };
  const onReset = () => {
    if (
      window.confirm(
        "Reset demo data? Records in this browser go back to the original synthetic seed.",
      )
    ) {
      resetDemo();
      resetLaunchpad();
      resetP01();
    }
  };

  const toggle = (
    <div
      role="group"
      aria-label="View as"
      className="flex rounded-full border border-border bg-muted p-0.5"
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => switchView(v)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${focus} ${view === v.id ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link to="/" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focus}`}>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-lg bg-heading text-white"
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-heading">IPP</span>
              <span className="block text-xs text-muted-foreground">
                Co-op Internship Practicum
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV[view].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-current={isActive(n.to) ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${focus} ${isActive(n.to) ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="hidden whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted-foreground lg:inline">
              View as
            </span>
            {toggle}
          </div>

          <button
            type="button"
            className={`ml-auto rounded-lg border border-border p-2 md:hidden ${focus}`}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>

        {menu && (
          <div
            id="mobile-menu"
            className="max-h-[75vh] overflow-y-auto border-t border-border bg-card px-4 py-3 md:hidden"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                View as
              </span>
              {toggle}
            </div>
            <nav aria-label="Main" className="mb-3 flex flex-col">
              {NAV[view].map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-lg px-2 py-2 text-sm font-medium ${focus} ${isActive(n.to) ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main
        id="main"
        className={`mx-auto w-full flex-1 px-4 pb-24 pt-8 md:px-6 md:pt-10 ${wide ? "max-w-6xl" : "max-w-5xl"}`}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm md:px-6">
          <div>
            <p className="font-medium text-heading">IPP | Sprint 3 | Group 2</p>
            <p className="text-xs text-muted-foreground">
              Co-op Internship Practicum Platform · University demo prototype
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Interface and employer side by{" "}
              <span className="font-medium text-heading">Group 2 (P02, Employer)</span>, with parts
              from Teams 1, 3 and 5.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              More from the teams:{" "}
              {TEAM_PAGES.map((t, i) => (
                <span key={t.to}>
                  {i > 0 && " · "}
                  <Link to={t.to} className={`hover:text-foreground hover:underline ${focus}`}>
                    {t.label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground ${focus}`}
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Reset demo data
          </button>
        </div>
      </footer>
      <Assistant />
    </div>
  );
}

/** Page title in Team 2's style: a small step label, a navy title and one plain sentence. */
export function PageHeader({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  step?: string;
}) {
  return (
    <div className="mb-8">
      {step && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{step}</p>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight text-heading md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-base text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-heading">{title}</h2>
      <div className="text-sm text-card-foreground">{children}</div>
    </section>
  );
}

type Tone = "green" | "amber" | "blue" | "red" | "gray";
const TONES: Record<Tone, string> = {
  green: "bg-status text-status-foreground",
  amber: "bg-warn text-warn-foreground",
  blue: "bg-sent text-sent-foreground",
  red: "bg-danger text-danger-foreground",
  gray: "bg-muted text-muted-foreground",
};

/** Picks the colour from the word, so every page uses the same colour for the same state. */
export function toneFor(text: string): Tone {
  const t = text.toLowerCase();
  if (/(reject|declin|urgent|not eligible)/.test(t)) return "red";
  if (/(closed|withdrawn|not placed|not now|draft|shortlist)/.test(t)) return "gray";
  if (/(approved|published|open|answered|accepted|can apply|resolved|placed|eligible)/.test(t))
    return "green";
  if (/(submitted|sent|career services|resubmitted)/.test(t)) return "blue";
  if (/(pending|waiting|change|shortlist|ready|review|one thing|interview)/.test(t)) return "amber";
  return "green";
}

export function Status({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const t = tone ?? (typeof children === "string" ? toneFor(children) : "green");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[t]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-3 text-muted-foreground">
      {children}
    </p>
  );
}
