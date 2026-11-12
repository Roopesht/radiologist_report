# WI-025: Patient details and sex header entry (api)

Applications: api (primary, APP-020). web is listed only because the API contract is consumed there; web code is changed by WI-026.
Requirement: REQ-267 (Enter patient details and sex) · Decision: DEC-301 · Feature: FEAT-1047
Q&A: docs/workitems/WI-025/qna.json (answered 2026-11-12)

## Scope and split with WI-026

- WI-025 (api): store the header, validate it, expose it over HTTP, add the Sr. No column and the allocator.
- WI-026 (web): the entry form, MR./MRS. shown from the sex choice, today's date as the default, the read-only Sr. No display, and the tag-engine sex value on the client.
- Not in either: issuing a report and calling the allocator on issue (REQ-273 owns the approval step). The allocator is built and tested here but not called by any route.

WI-026's plan (docs/workitems/WI-026/impl.md) still says the form takes Sr. No as input and saves it. That contradicts the decisions below and must be corrected before WI-026 is implemented.

## Rules this plan follows

From the answered Q&A:
- Sex is male or female only. Codes are M and F from the existing `sexes` table. Titles are MR. (M) and MRS. (F).
- Sr. No is generated, never typed.

From docs/project/decisions.md, 2026-11-12 (user-authorized for planning; Product Owner confirmation still pending):
- Sr. No is assigned when a report is issued, never on draft creation. Drafts have `sr_no` NULL.
- Numbering is sequential and global (1, 2, 3...). No yearly or daily reset.
- A number is never reused, including after cancellation. Gaps are allowed.
- Allocation runs in a single transaction (BEGIN IMMEDIATE) and relies on UNIQUE on `sr_no`.

Assumptions made here (not in the sources):
- `sr_no` is INTEGER. docs/project/db_design.md says TEXT, docs/project/db_design_proposal_sr_no.md says INTEGER; the proposal is used because the decisions point to it.
- The reports table gains `status` and `issued_at`, as in the proposal. This plan does not edit db_design.md.
- `report_date` is stored as YYYY-MM-DD. The web layer shows it as d-MMM-yy.
- `age_text` is stored as entered. No range or format validation, because none is specified.
- Name, referred_by, UHID are free text. No validation, because none is specified.
- `radiologist_id` on a new draft comes from the signed-in user's `radiologists` row (matched by `user_subject`). No row means the request is refused with 403.

## Data

Add a new migration in apps/api/src/db/migrations.ts (do not edit an applied migration). Keep apps/api/src/db/schema.ts in step.

- `patients`: id, uhid (UNIQUE), name, sex_code (FK sexes.code), created_at. Exactly as db_design.md.
- `reports`: id, patient_id (FK patients.id), status (`'draft'` | `'issued'` | `'cancelled'`), age_text, referred_by (nullable), report_date (YYYY-MM-DD), sr_no (INTEGER, nullable, UNIQUE), radiologist_id (FK radiologists.id), issued_at (nullable), created_at, updated_at.
  - CHECK: `sr_no IS NULL` when status = 'draft'; `sr_no IS NOT NULL` when status IN ('issued','cancelled').
- `sr_no_counter`: name (TEXT PK), last_value (INTEGER NOT NULL DEFAULT 0). Seed one row with name 'report_sr_no'.

## API

Routes go in apps/api/src/glue/routes.ts; logic in a new apps/api/src/reports/ folder.

- `POST /api/reports`: body `{ uhid, name, sexCode, ageText, referredBy?, reportDate }`. Creates the patient if the UHID is new, otherwise checks that the existing patient matches. Creates a draft report. Returns the report with `srNo: null`.
  - sexCode must exist in `sexes`. Otherwise 422.
  - reportDate must be YYYY-MM-DD. Otherwise 422.
- `GET /api/reports/:id`: returns the header and `srNo` (null for drafts).
- `PATCH /api/reports/:id`: updates header fields on a draft only. Any `srNo` in the body is ignored and must not be stored. A non-draft report returns 409.
- `allocateSrNo(tx, reportId)` in apps/api/src/reports/srNo.ts: the transaction described in the decisions. Exported and unit-tested. Not called by any route in this work item.

## Tests

Put them in apps/api/tests/reports/ (the existing rules tests are in apps/api/tests/rules/):
- Creating a draft stores sex_code M or F, and `srNo` is null.
- An invalid sexCode returns 422 and nothing is stored.
- PATCH cannot set `srNo`, and PATCH on an issued report returns 409.
- The database CHECK rejects `sr_no` set on a draft.
- allocateSrNo gives 1, then 2, on consecutive calls.
- allocateSrNo never reuses a number after a cancel (cancelled keeps its number).
- Two allocations on the same report: the second is refused, and the counter does not move.
- The sex value is readable from GET so the tag engine can use it (sex_code is M or F).

Run the api test script from apps/api/package.json. The existing tests must still pass.

## Order and dependencies

- Depends on the rules work already present in apps/api/src/rules/ (no code change to it here).
- WI-026 depends on the API routes above.

## Open points (do not block this plan; confirm before REQ-273)

- Product Owner confirmation of the 2026-11-12 Sr. No decisions, if KNM requires it.
- REQ-267 req.md and mock.md still list Sr. No as an entered field. The changes are in docs/requirements/REQ-267/proposed-changes.md and are not applied. Until they are, this plan follows the decisions, not the approved wording.
- Confirmation of the reports table changes in db_design_proposal_sr_no.md.
