# WI-026: Patient details and sex entry form

Applications: web (primary), api

Requirement: REQ-267 (Enter patient details and sex)
Decision: DEC-301 · Feature: FEAT-1047

## Approach
- web: add a "Patient details" section to the report entry screen with fields for Name, Age/Sex (age plus a sex choice M/F), Referred by, Date, UHID NO and Sr. No.
- Sex choice drives the title: male shows "MR.", female shows "MRS.". The title is derived, not typed.
- Date defaults to today, formatted d-MMM-yy (e.g. 14-Sep-26).
- api: persist the header fields and the sex value so the tag engine can read sex for sex-specific tags (REQ-266 rules live in one place).

## Areas and files likely affected
- web: the report entry screen and its form components under apps/web/src (new patient-details component; date formatting helper; wiring into router apps/web/src/app/router.tsx).
- web: client state and API calls, apps/web/src/state/rulesClient.ts and apps/web/src/rules/ (sex value read by the tag engine).
- api: request/response schema for the report header (apps/api/src/db/schema.ts) and the glue routes (apps/api/src/glue/routes.ts) if header fields are stored with the report.
- api: validation for the sex value (male/female only for now).
- Tests (likely locations): web component tests under apps/web/tests/rules/, api contract tests under apps/api/tests/rules/.

## Behaviour to verify
- All six header fields can be entered and saved.
- Sex "male" shows MR.; "female" shows MRS.
- Date field defaults to today in d-MMM-yy.
- Sex value is available to the tag engine.

## Risks
- The header schema change touches shared DB schema (apps/api/src/db/schema.ts) and migrations, which other in-progress work also edits. Coordinate before merging.
- Date format d-MMM-yy depends on locale; formatting must be fixed, not locale-driven.

## Assumptions
- Sex list is male/female only. Acceptance criteria state only these two values; other values are out of scope.
- Sr. No is typed, not generated. Acceptance says all header fields "can be entered", so typed input is the reading taken here. If it should be generated, this changes the plan.
- Name, referred-by, UHID and Sr. No are entered as free text. No validation rule is specified in REQ-267 or DEC-301; none is implemented here.
- REQ-267 (req.md) still lists these open questions: sex/title list values, and whether Sr. No is generated or typed. The approved acceptance criteria answer the first (male/female only). The second is read as "typed" from "all header fields can be entered"; the product owner should confirm this if it is wrong.
