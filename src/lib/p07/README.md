# P07: Co-op learning and progress

One page, `/p07`, for Layla Hassan (COOP-B001) on placement EG-DXB-028. Records stay in this browser (`ipp-p07-v1`). Import from `@/lib/p07`.

The page reads `placements`, `applications` and `skill_evidence` through `@/lib/db`. On 24 Nov 2026 there is no placement row for COOP-B001 (APP-028 is `submitted`) and no E-JIRA-01. Those two inputs are stand-ins.

## P04 → P07, `p04-placement/1`

Required. `university_status` must be `confirmed`. An offer or a submitted application is refused.

```json
{
  "contract": "p04-placement/1",
  "placement_id": "EG-DXB-028",
  "student_id": "COOP-B001",
  "application_id": "APP-028",
  "opportunity_id": "OP-028",
  "opportunity_version": 2,
  "profile_version": 3,
  "employer_name": "Emirates Group",
  "title": "Aviation Analytics Intern",
  "city": "Dubai",
  "supervisor_name": "Omar Faris",
  "start_date": "2027-02-01",
  "end_date": "2027-05-31",
  "confirmed_by": "Co-op office: N. Al Mansoori (synthetic)",
  "confirmed_at": "2026-08-20T09:00:00.000Z",
  "university_status": "confirmed",
  "source": "stand-in"
}
```

`source` is `p04` when P04 sends it. Dates match the published OP-028 listing. The page date is 24 Mar 2027, inside that listing.

## P06 → P07, `p06-readiness/1`

Optional. `null` is allowed. `demonstrated` here is preparation, not a placement outcome. Log evidence ids are `EV-…`, so a preparation id cannot be cited as outcome evidence.

```json
{
  "contract": "p06-readiness/1",
  "student_id": "COOP-B001",
  "summary_id": "RDY-B001",
  "source": "stand-in",
  "items": [
    {
      "skill_id": "SK-JIRA-01",
      "evidence_id": "E-JIRA-01",
      "activity": "Jira preparation: create a work item, set an assignee, explain a status change.",
      "review_outcome": "demonstrated",
      "reviewer": "P06 reviewer (synthetic)",
      "reviewed_at": "2026-08-28"
    }
  ]
}
```

## Stories

| ID | Story | Acceptance |
| --- | --- | --- |
| P07-01 | As Layla, I agree one goal for each outcome | Agreeing locks the goals for this period |
| P07-02 | As Layla, I revise a log after a supervisor request | Original, feedback and revision stay visible |
| P07-03 | As the advisor, I mark one outcome evidenced and one missing | A citation must be on a log for that outcome |
| P07-04 | As the advisor, I record a midpoint action with an owner, due date and closure | Overdue and completed both stay on the list |
| P07-05 | As the supervisor and the advisor, we record separate final comments | The next-period goal stays not started |
| P07-06 | As P04 and P06, we hand over a confirmed placement and an optional readiness summary | An unconfirmed placement is refused; a missing summary is allowed |

## This slice

Two outcomes. One goal is logged, revised after supervisor feedback, judged from `EV-028-1`, and tied to a midpoint action. The other outcome is marked missing. Employer feedback and the academic judgement are separate. The next-period goal stays "Not started".

## Writes

`POST /api/p07/log` writes one row to `learning_logs` with `P07_TEAM_KEY` (server only). Without the key, writes are off. `COOP-B001`–`COOP-B006` are refused. The default scope only allows `COOP-Z001`. The Layla demo stays in the browser.

## Sprint 4

Write with `P07_TEAM_KEY` once the shared table can store versions, actions and a split final review. Replace the stand-ins when P04 writes EG-DXB-028 and P06 writes E-JIRA-01. Add the third catalogue goal, a host-milestone case, and peer checks.
