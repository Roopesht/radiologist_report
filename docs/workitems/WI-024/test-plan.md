# Test plan: Keep abbreviation rules in one place (WI-024, REQ-266)

Test case: TC-009. Work item: WI-024. Requirement: REQ-266 (acceptance criteria 1 to 6 in docs/requirements/REQ-266/req.md).

Scope agreed for this test plan:
- Report generation is not implemented. Criteria 3 and 4 are BLOCKED and have no test steps yet.
- Criterion 1 covers only the 18 verified source rules (docs/workitems/WI-024/source-check.md). The other 30 source rows are a known gap, not tested.

## Environment and test data
- API: `apps/api`, compiled and run locally (port 3000). Database: a SQLite file. Automated tests use a new temporary file per test.
- Web: `apps/web` (port 5173). Manual UI tests use a radiologist token (JWT with role `radiologist`, subject linked to a radiologists row).
- Manual tests start from an empty rules table, then seed the 18 verified rules (`seedSourceRules`) once for the radiologist row.
- Do not use real patient data or the real signing doctor's record. Test radiologists are placeholders.

## Automated tests (existing)
- `apps/api`: `npx jest tests/rules` (store, source seed, HTTP and access tests).
- `apps/web`: `npx jest tests/rules` (form model, list and editor screens, routes).
Each scenario below names the test file that covers it, where one exists.

## Criterion 1: every tag in source 133 has findings text, and an impression where the source defines one

| ID | Steps | Expected result | Covered by |
|---|---|---|---|
| T1-1 | Seed the 18 verified rules for a radiologist. List all rules. | 18 rules exist, codes B, c, Li, Mc, MML, NF, NL, O, LOP, ROP, P, PC, PD, PR, S, U, UME, UNV. | sourceSeed.test.ts |
| T1-2 | For each of the 18 rules, compare findings text with the source wording in source-check.md. | Each text matches the source exactly (no added, removed or corrected words). | sourceSeed.test.ts |
| T1-3 | Check impression text on each rule. | Only MML and PC have an impression (MML: "Mild Mesenteric Lymphadenopathy."; PC: "cect abdomen to confirm or exclude pancreatic calcification."). The other 16 have none. | sourceSeed.test.ts |
| T1-4 | Check the findings and impression text of all 18 rules for placeholder symbols "�" and blanks "...". | None found. | sourceSeed.test.ts |
| T1-5 | Seed again. | No new rules, no new versions. | sourceSeed.test.ts |
| T1-6 | Open the list page in the browser. | All 18 tags appear with their findings text; impression column shows the two impressions and "none" for the others. | Manual (RulesPages.test.tsx covers list rendering with mock data) |

Known gap (not tested): the 30 source rows listed in source-check.md.

## Criterion 2: each option set is stored as its own list of values, with the rule that uses it

| ID | Steps | Expected result | Covered by |
|---|---|---|---|
| T2-1 | Create a test rule with options: side L, side R, calyx u, grade "mildly" (impression "Mild"), size range 14 to 15.49 for sex M. | Rule saved; each option is returned with its kind and values; each references the rule. | store.test.ts (creating a rule) |
| T2-2 | Read the rule back. | Options are returned in the order saved, with values unchanged. | store.test.ts |
| T2-3 | Create a size range with minimum above maximum through the API. | Rejected with 422, path naming the size range option. | Not automated on the server (gap). The browser form blocks it (ruleForm.test.ts). The database rejects it on a raw insert (store.test.ts). |
| T2-4 | Create an option of kind `side` with no value, a `grade` with no wording, a `sex` with no sex code, and two identical options. | Each rejected with 422 and the path of the faulty option. | store.test.ts |
| T2-5 | Create an option with sex code "X". | Rejected with 422 (unknown sex code). | store.test.ts |
| T2-6 | In the browser, add a side option and a size range on the editor, save, reopen. | Options shown with the saved values. | Manual |

Note: the seeded source rules carry no option sets (their sex and size mappings are not clear in the source). Option tests use test rules, not source wording.

## Criterion 3: the next report generated uses the saved wording; earlier reports are not altered

BLOCKED. Report generation is not implemented, so no test steps can be written. Unblock by defining the report-generation interface and then writing scenarios for: a saved change appears in the next generated report; a report generated before the change keeps its old wording.

## Criterion 4: no tag wording used by report generation exists outside the rules store

BLOCKED. Depends on report generation (criterion 3). Once it exists, the check is: search the code and templates for each stored wording and confirm each match is the rules store. Known candidate outside the store: docs/mock/apps/radiology-report/mock-app/mock-data/seeds/create-report.json (reference mock; not changed).

## Criterion 5: radiologists and admins can create, edit, view and manage rules

| ID | Steps | Expected result | Covered by |
|---|---|---|---|
| T5-1 | Call the rules list with a radiologist token. | 200 with the rules. | api.test.ts |
| T5-2 | Create, view and edit a rule with a radiologist token. | 201, 200, 200 respectively. | api.test.ts; store.test.ts |
| T5-3 | Call the list with an admin token (admin with a radiologist record). Create a rule. | 200 for the list; 201 for the create. | api.test.ts |
| T5-4 | Call the list with an admin token that has no radiologist record. Try to create a rule. | List 200; create 403 with error `not-a-radiologist`. | api.test.ts |
| T5-5 | Call the API with a token whose role is neither radiologist nor admin (for example `reporter`). | 403 on list, create and edit. | api.test.ts |
| T5-6 | Call the API with no token. | 401 on every rules endpoint. | api.test.ts |
| T5-7 | In the browser, use the token field with a radiologist token, then add and edit a tag. | List loads; add and edit succeed; list shows the change. | Manual (RulesPages.test.tsx covers screens with mocked API) |
| T5-8 | In the browser, use no token, or a reporter token. | The list shows a sign-in or permission message, not raw error codes. | RulesPages.test.tsx (403 message) |

## Criterion 6: every rule change is versioned and audited (who, what, when)

| ID | Steps | Expected result | Covered by |
|---|---|---|---|
| T6-1 | Create a rule, then change its findings text. | History shows version 1 (created) and version 2 (summary "changed: findings text"). | store.test.ts; api.test.ts |
| T6-2 | Each history entry. | Shows the editor (radiologist id), the time, the old and new text, and the before and after snapshot. | store.test.ts |
| T6-3 | Change an option set only. | Version 2 with summary "changed: options"; snapshot shows the option change. | store.test.ts |
| T6-4 | Save a rule with no change. | `changed: false`; no new version. | store.test.ts |
| T6-5 | Try to change the tag code of an existing rule. | Rejected with 422 (code cannot be changed). | store.test.ts |
| T6-6 | Force a failure while the change is saved. | The rule, its options and its history stay unchanged (nothing partly saved). | store.test.ts |
| T6-7 | After each successful write, check the audit output of the API. | One entry per write with the user, the action (for example `PUT /api/rules/<id>`), the status, and a time. | api.test.ts |
| T6-8 | Read the history from the browser. | Not in the current screens; test via the API endpoint `GET /api/rules/<id>/history`. | api.test.ts |

## Known gaps and open items
- Criteria 3 and 4 blocked (no report generation).
- Criterion 1 covers 18 of 49 source rows.
- Server-side 422 for a size range with minimum above maximum (T2-3) has no automated test.
- Criteria 5 and 6 (who may manage rules; versioning and audit) are project-lead decisions dated 2026-11-11, pending confirmation by the product owner (Pankaj). Tests reflect the project-lead direction.
- Web sign-in is not built; testers paste a token into the rules page.
