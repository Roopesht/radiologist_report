# Implementation: Keep abbreviation rules in one place (WI-024)

Applications: api (primary), web (other)

Requirement: REQ-266 (approved, order 1 of 9). Decision DEC-300, feature FEAT-1046.

## Approach
- Store every tag's rule in one rules store in the api: the tag, findings text, optional impression, and its option sets (side, size range, calyx position, grade, sex). Each option set is stored as its own list of values, referenced by the rule that uses it.
- Report generation reads wording only from this store. A saved rule change applies to the next report generated; reports already generated are not altered.
- Radiologists and Admins can create, edit, view and manage rules through the web app (rules list and edit screen, following the mock in docs/mock/apps/radiology-report/mock-app/screens/main/tags.js).
- Every rule change is versioned and audited (who, what changed, when), using the existing audit module.
- Remove any tag wording used by report generation that is not in the store (acceptance 4).

## Areas and files likely affected
api (primary, apps/api):
- apps/api/src/db/schema.ts: replace the starter `settings` table with the rules tables (see docs/project/db_design.md for the agreed tables and columns, SQLite 3).
- apps/api/src/db/migrate.ts: matching SQL for the rules tables (the migration stays with the database module).
- apps/api/src/glue/routes.ts: register rules routes (create, edit, view, manage) at the `knm:entries` marker.
- apps/api/src/audit/auditTrail.ts and auditMiddleware.ts: write a version and audit entry on every rule change.
- apps/api/src/auth/authMiddleware.ts: restrict rule management to Radiologist and Admin roles.
- Report generation code: not present in the tracked files yet. It must read tag wording from the store; locate or create it before implementing acceptance 3 and 4.

web (other, apps/web):
- apps/web/src/app/router.tsx: rules list and edit routes.
- Rules list and edit screens, built from the mock (Tag, Findings text, Impression; Edit, Add tag).
- apps/web/src/state/: store and async hooks for rules.

## Risks
- Report generation code does not exist in the tracked files, so acceptance 3 and 4 cannot yet be checked against code.
- Tag wording may already be duplicated in templates or code. Acceptance 4 requires searching the code and templates for each stored wording.
- Source of truth is Abbreviation Rules v4 (docs/project/source/, source 133). Wording must match it exactly.

## Assumptions
- Acceptance 1 to 4 follow from DEC-300 and FEAT-1046.
- Acceptance 5 (Radiologists and Admins manage rules) and 6 (versioning and audit) are project-lead decisions dated 2026-11-11, not confirmed by the product owner (Pankaj). Pending confirmation.
- The rules store is the only place tag wording lives; no separate cache of wording is needed beyond the existing cache module (apps/api/src/cache/).

## Tests
- Contract: every tag in Abbreviation Rules v4 has findings text; impression stored only where the source has one.
- Contract: each option set matches the source wording exactly.
- Behaviour: a saved rule change is used by the next generated report; an earlier report is unchanged.
- Search: no tag wording used by report generation exists outside the store.
- Access: Radiologist and Admin can manage rules; other roles cannot.
- Audit: each change creates a version and an audit record with user, change and time.
