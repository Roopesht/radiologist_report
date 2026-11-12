# DB design proposal: Sr. No allocation (SQLite 3)

Status: PROPOSED. Based on user-authorized decisions in docs/project/decisions.md (2026-11-12). Not Product Owner approved. docs/project/db_design.md is NOT changed by this file.

Applies to: docs/project/db_design.md, table `reports`, and a new table `sr_no_counter`.

## Changes to `reports`

| Column | Current design | Proposed | Reason |
|---|---|---|---|
| sr_no | TEXT, nullable, UQ | INTEGER, nullable, UNIQUE | Sequential numbers (decision 2). NULL for drafts (decision 5). SQLite UNIQUE allows several NULLs, so drafts do not collide. |
| status | (missing) | TEXT NOT NULL DEFAULT 'draft', CHECK (status IN ('draft','issued','cancelled')) | Needed to know when a report is issued (decision 1) and cancelled (decision 6). |
| issued_at | (missing) | TEXT NULL | Set at issue. Records when the number was assigned. |

Constraint: `sr_no IS NULL` when `status = 'draft'`; `sr_no IS NOT NULL` when `status IN ('issued','cancelled')`. Enforce with CHECK.

## New table `sr_no_counter`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| name | TEXT | No | | PK. Single row: 'report_sr_no'. |
| last_value | INTEGER | No | 0 | Highest number ever issued. Never decremented (decisions 3 and 6). |

## Allocation at issue (decision 7)

Done in one transaction, started with BEGIN IMMEDIATE (SQLite serialises writers):
1. `UPDATE sr_no_counter SET last_value = last_value + 1 WHERE name = 'report_sr_no' RETURNING last_value;`
2. `UPDATE reports SET sr_no = :n, status = 'issued', issued_at = :now WHERE id = :id AND status = 'draft' AND sr_no IS NULL;`
3. If step 2 changes no row, roll back (report already issued or changed).
4. COMMIT.

Duplicates are prevented by the single-writer transaction and by the UNIQUE constraint on `sr_no`. Cancelling a report only sets `status = 'cancelled'`. It never clears or reuses `sr_no`.

## Open points for the DB design
- Table `reports` gains status and issued_at, which the design does not have today. Confirm before editing db_design.md.
- The REQ-273 review/approval step must be the only path to `issued`. Confirm the approval step is defined there.
