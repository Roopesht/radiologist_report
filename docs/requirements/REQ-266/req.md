# Keep abbreviation rules in one place

Order: 1 of 9
Depends on: none

## Purpose
As a radiologist, I can maintain the abbreviation rules (tag, findings text, impression, options) in one place.

## Why
Rules must live in one place so every tag expands consistently (intent G4). Source: 133. Abbreviation Rules v4.docx.

## Behaviour and acceptance
Acceptance:
1. Every tag in source 133 (Abbreviation Rules v4) has a findings text; a tag whose source entry has an impression stores that impression, and a tag without one stores none.
2. Each option set in the source wording is stored as its own list of values with the rule that uses it: side (Left, Right, bilateral), size range, calyx position (upper, upper middle, middle, lower middle, lower), grade (mild to marked), and sex (male, female). A rule's text refers to its option sets, so a test can list every option set and compare it with the source.
3. After a rule is saved, the next report generated for any tag uses the saved wording; a report generated before the change is not altered.
4. No tag wording used by report generation exists outside the rules store (checked by searching the code and templates for each stored wording).
5. Radiologists and Admins can create, edit, view and manage abbreviation rules. (Project decision, 2026-11-11, by the project lead while the product owner is unavailable. Not confirmed by the product owner, Pankaj.)
6. Every rule change is versioned and audited, recording who made the change, what changed, and when. (Project decision, 2026-11-11, by the project lead while the product owner is unavailable. Not confirmed by the product owner, Pankaj.)

## Order
1 of 9 (first: every later story reads the rules)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Decisions (project assumptions)
These two decisions are not in the sources (133 or the feature/decision text).
- Decision-maker and date: the project lead (the user of this workspace), 2026-11-11, stated as taking responsibility for the project decisions while the product owner, Pankaj, is unavailable.
- Status: the product owner has not confirmed either decision. Pankaj's confirmation is still pending. Nothing here represents his approval.
- Who edits the rules: Radiologists and Admins can create, edit, view and manage abbreviation rules. (project decision, 2026-11-11; not confirmed by the product owner)
- Versioning and audit: every rule change is versioned and audited, recording who made it, what changed and when. (project decision, 2026-11-11; not confirmed by the product owner)

## Consistency with DEC-300 and FEAT-1046
- DEC-300 and FEAT-1046 both say rules live in one place so every tag expands consistently (G4) and that all tag expansion reads from it. Criteria 1 to 4 follow from this.
- Criteria 5 and 6 (who may manage rules, versioning and audit) go beyond the decision and feature text. That is why they are labelled as assumptions.
