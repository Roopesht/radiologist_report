# Keep abbreviation rules in one place

Order: 1 of 9
Depends on: none

## Purpose
As a radiologist, I can maintain the abbreviation rules (tag, findings text, impression, options) in one place.

## Why
Rules must live in one place so every tag expands consistently (intent G4). Source: 133. Abbreviation Rules v4.docx.

## Behaviour and acceptance
Acceptance:
- Each tag has findings text and, where defined, an impression
- Tags with options (side, size range, grade, calyx) store their option sets
- A change to a rule is used by the next report generated
- No tag wording exists outside this place

## Order
1 of 9 (first: every later story reads the rules)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- Who edits the rules: only the radiologist or an admin role? (not in sources)
- Is a rule change versioned or audited? (not in sources)
- PO (Pankaj) to answer before approval.
