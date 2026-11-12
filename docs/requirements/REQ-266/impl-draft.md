DRAFT implementation plan for REQ-266 (Keep abbreviation rules in one place)

Status: DRAFT. Not a KNM work item. Not uploaded to KNM. Not approved.
Requirement status: finalized (not approved). KNM creates work items only from an approved requirement, so this plan cannot become a work item until the product owner approves REQ-266.
Decision-maker for the two project decisions: the project lead, 2026-11-11, while the product owner (Pankaj) is unavailable. Pankaj has not confirmed them.

Applications: apps/api (primary: rules store, versioning and audit, report generation reads from it), apps/web (other: rule management screens and tag entry)

## 1. Approach
- The rules live in one store (criterion 1, 2, 4). Report generation reads wording only from the store (criterion 3, 4).
- A rule change is saved as a new version, and a history row records who, what and when (criterion 6, decision D-6).
- Reports keep their own snapshot of the wording they were issued with (see docs/project/db_design.md, report_findings and report_impressions), so a later rule change does not change an issued report.
- Permissions: Radiologists and Admins can create, edit, view and manage rules (criterion 5, project decision; D-7 adds a user and role table).

## 2. Current repository state (verified)
- apps/api/src/db/schema.ts holds only a generic starter table (settings). No rules tables exist yet.
- apps/api/src/glue/routes.ts and apps/web/src/app/router.tsx are starter stubs.
- So every rules table, route and screen must be created. No existing rule code is changed.

## 3. Files likely affected (to be confirmed when work starts)
apps/api:
- src/db/schema.ts: add tables sexes, tags, tag_options, impression_suppressions, tag_rule_history, users_roles (D-7). Follow docs/project/db_design.md.
- src/db/migrate.ts and the SQL migration: match the schema; PRAGMA foreign_keys=ON.
- src/rules/ (new): store module, versioning, audit, permission checks.
- src/glue/routes.ts: rules endpoints (list, read, create, edit, history).
- tests/modules/...: contract and fit tests per criterion (see section 5).
apps/web:
- src/app/router.tsx: rule management route.
- src/app (new screens): list of rules, edit form, history view.

## 4. Schema changes (proposed; PO approval pending)
D-1: tag_options.kind adds `grade` (liver grades).
D-2: side codes add `bilateral` (impression wording, row 12) if the radiologist confirms (R-05).
D-3: tags.findings_text is nullable for impression-only tags (DS, row 6).
D-4: male and female wording on one tag is a sex option kind, not a second tag (rows 13, 16, 17).
D-5: Li is one tag: row 2 is the base finding; row 16 supplies grade and size options. Confirm with R-04.
D-6: option-level audit and a version number in the history.
D-7: user and role table, so Admin changes can be recorded.
Not decided here: the size-range boundary rule (R-02), the sex mapping of the liver sets (R-01), composite rules UU, Upp, SL (PO-03).

## 5. Test plan (one test per acceptance criterion)
1. Each tag has findings text and, where the source has one, an impression. Test: compare stored rows with the seed list, which is blocked until D-8 items are answered.
2. Each option set is stored with its rule. Test: list every option set and compare with the source (rows 11, 12, 16; blocked for mapping R-01, R-02).
3. A saved rule change is used by the next generated report; old reports keep their wording. Test: generate, change, generate again; compare.
4. No tag wording used by report generation exists outside the store. Test: search code and templates for each stored wording.
5. Radiologists and Admins can create, edit, view and manage rules; others cannot. Test: role matrix.
6. Each rule change is versioned and audited with who, what and when. Test: change a rule, read the history row.

## 6. Seeding (blocked)
Do not seed any row until the radiologist has answered the blocking items:
- 12 rows with no code: rows 4, 5, 13, 26, 37, 42, 43 (no code), and 41, 44, 45, 47, 49 (label only). Questions R-12, R-13, R-16 to R-19, R-28.
- 3 garbled codes: `Ecfwfc wpcoew` (row 7), `HSOCS SS AA LP LMA…` (row 10), `..... cm cds apa` (row 48). Questions R-09 to R-11.
- Syntax-only code cells: `[L,R]` (row 11) and `[L, R]5-14.99[u, um, m, lm, l]` (row 12). Question R-07.
- Duplicate Li (rows 2 and 16). Question R-04.
- Composite and unclear rules: UU, Upp, SL, UB2, UB3, BU, U. Questions R-21, R-22, R-24, R-25, PO-03.
Full list: docs/requirements/REQ-266/ (see the scratchpad clarification file).

## 7. Risks
- The source is one table; the code pairing was checked through Word's table cells. Printed layout was not rendered.
- Some tags have no code. Seeding them would invent codes (not allowed).
- Two assumptions (who may edit, versioning and audit) are project decisions, not confirmed by the product owner.
- Liver size sets have boundary gaps and an unstated sex mapping.

## 8. Steps once REQ-266 is approved in KNM
1. Product owner approves REQ-266 in KNM (only the product owner role can).
2. Run `/knm:add-workitem REQ-266` (creates the work item and writes impl.md through KNM).
3. Run `/knm:finalize-workitem <id>` after answering any questions.
4. Implement sections 3 and 4, with tests from section 5, after the schema decisions are approved.
