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
- Radiologists and Admins can create, edit and manage abbreviation rules
- Every abbreviation rule change is versioned and audited, recording who made the change, what changed and when

## Order
1 of 9 (first: every later story reads the rules)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Decisions (project assumptions)
These two decisions were not in the sources. They are project assumptions adopted while the product owner (Pankaj) is unavailable. Pankaj's confirmation is still pending and must be obtained before approval.
- Who edits the rules: Radiologists and Admins both create, edit and manage abbreviation rules. (assumption, PO confirmation pending)
- Versioning and audit: every rule change is versioned and audited, recording who made it, what changed and when. (assumption, PO confirmation pending)
