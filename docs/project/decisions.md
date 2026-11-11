# Decisions

## 2026-11-11: Single clinic, no multi-tenancy
Decided by: user. The system serves one clinic. No tenancy column or module.
Applies to: docs/project/db_design.md (Constraints: single clinic, no tenancy).
Conflict found: scaffolding plan SCF-0001 includes the `multi-tenant` module (api). A plan is immutable, so SCF-0001 is not applied; a new plan without `multi-tenant` is needed.
