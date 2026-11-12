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

### S4. Radiologist and Admin can manage rules (acceptance 5)
- Steps: as a Radiologist and as an Admin, create, edit, view and manage a rule through the API and the web rules screens.
- Expected: each action succeeds.
- Steps: as any other role, attempt the same actions.
- Expected: each action is refused.
- Note: acceptance 5 is a project-lead decision (2026-11-11) not yet confirmed by the product owner. This scenario tests the decision as written.

### S5. Every rule change is versioned and audited (acceptance 6)
- Steps: as a Radiologist, change one rule's findings text, then one option set. Read the version history and the audit log.
- Expected: each change creates one version and one audit record with the user, what changed and the time.
- Note: acceptance 6 is a project-lead decision (2026-11-11) not yet confirmed by the product owner. This scenario tests the decision as written.

## Not covered here
- Acceptance 3 (a saved change is used by the next generated report) and acceptance 4 (no tag wording outside the rules store). Both need report generation code, which is not in the repo. They belong to the later stories (REQ-268 onward) and are not tested by this plan.
