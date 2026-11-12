# Decisions

## 2026-11-11: Single clinic, no multi-tenancy
Decided by: user. The system serves one clinic. No tenancy column or module.
Applies to: docs/project/db_design.md (Constraints: single clinic, no tenancy).
Conflict found: scaffolding plan SCF-0001 includes the `multi-tenant` module (api). A plan is immutable, so SCF-0001 is not applied; a new plan without `multi-tenant` is needed.

## 2026-11-12: Sr. No rules (user-authorized project decisions for planning)
Status: user-authorized for planning. PENDING formal Product Owner confirmation if KNM requires it. Pankaj is currently unavailable. The user authorized these as project-level decisions. This is NOT Product Owner approval and must not be recorded as Pankaj's approval.
Applies to: REQ-267 (Sr. No), REQ-273 (issue and approval), WI-025 (api), WI-026 (web), docs/project/db_design.md (reports.sr_no), docs/project/db_design_proposal_sr_no.md.

Decisions:
1. Sr. No is generated when a report is approved/issued, not when a draft is created.
2. Numbering is sequential and global: 1, 2, 3...
3. The sequence is never reset (no yearly or daily reset).
4. Sr. No values are globally unique across the system.
5. Draft reports have no Sr. No.
6. Once issued, a Sr. No is permanent and is never reused, even if the report is cancelled. Cancelled reports keep their number, so gaps in the sequence are allowed.
7. Allocation uses transactional allocation so concurrent approvals cannot produce duplicates.

Resolved by these decisions:
- Gap question (earlier REQ-273 open item): gaps are allowed. Numbers are consumed at issue, never at draft creation or on cancellation.

Still to confirm:
- Product Owner confirmation of these decisions, if KNM requires it.
- REQ-267 wording and mock changes (see docs/requirements/REQ-267/proposed-changes.md). REQ-267 is approved and is not edited by this note.

Status changes: none. WI-025 and WI-026 are not finalized or implemented under these decisions.
