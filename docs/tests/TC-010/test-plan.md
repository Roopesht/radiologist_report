# Test plan: Abbreviation rules kept in one place (TC-010)

Requirement: REQ-266 (approved). Work item: WI-024 (api primary, web other).
Source of truth for wording and option sets: Abbreviation Rules v4 (source 133, docs/project/source/).

## Scenarios

### S1. Every tag has findings text (acceptance 1)
- Steps: list every tag in Abbreviation Rules v4 from the rules store (API).
- Expected: each tag from source 133 is present with a non-empty findings text that matches the source wording exactly.

### S2. Impression stored only where the source has one (acceptance 1)
- Steps: for each tag, read the stored impression.
- Expected: a tag whose source entry has an impression stores that impression, verbatim. A tag without one stores no impression (null or empty, not a copied value).

### S3. Option sets stored as lists (acceptance 2)
- Steps: read each option set through the rules store and compare with the source wording.
- Expected:
  - side: Left, Right, bilateral
  - calyx position: upper, upper middle, middle, lower middle, lower
  - grade: mild to marked (values as in the source)
  - sex: male, female
  - size range: values as in the source
- Each option set is its own list, and each rule that uses an option set refers to it (no inline copies of its values in the rule text).

### S4. Saved change used by the next report (acceptance 3)
- Steps: 1) generate a report for a tag and record its wording. 2) edit that tag's findings text through the rules API. 3) generate a new report for the same tag.
- Expected: the new report contains the saved wording. The first report is unchanged when read again.

### S5. No tag wording outside the store (acceptance 4)
- Steps: for each stored findings text and impression, search the api and web code, the templates and the report generation code for that wording.
- Expected: the wording appears only in the rules store (seed or migration data for the store is the store). No other occurrence is used by report generation.

### S6. Radiologist and Admin can manage rules (acceptance 5)
- Steps: as a Radiologist and as an Admin, create, edit, view and manage a rule through the API and the web rules screens.
- Expected: each action succeeds.
- Steps: as any other role, attempt the same actions.
- Expected: each action is refused.
- Note: acceptance 5 is a project-lead decision (2026-11-11) not yet confirmed by the product owner. This scenario tests the decision as written.

### S7. Every rule change is versioned and audited (acceptance 6)
- Steps: as a Radiologist, change one rule's findings text, then one option set. Read the version history and the audit log.
- Expected: each change creates one version and one audit record with the user, what changed and the time.
- Note: acceptance 6 is a project-lead decision (2026-11-11) not yet confirmed by the product owner. This scenario tests the decision as written.

## Not covered here
- Report generation entry point: the implementation notes say report generation code is not in the tracked files yet. S4 and S5 need that entry point and are to be run once it exists.
