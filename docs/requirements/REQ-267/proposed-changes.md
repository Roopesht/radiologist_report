# REQ-267: proposed wording and mock changes (NOT APPLIED)

Status: PROPOSED. REQ-267 is approved. These changes need Product Owner approval through KNM before req.md or mock.md are edited. Based on the user-authorized Sr. No decisions in docs/project/decisions.md (2026-11-12), pending PO confirmation.

## req.md

Purpose (current): "As a radiologist, I can enter name, age/sex, referred by, date, UHID and Sr. No."
Proposed: "As a radiologist, I can enter name, age/sex, referred by, date and UHID, and see the Sr. No assigned to an issued report."

Acceptance (current):
- All header fields from the signed report can be entered
- Choosing male shows MR., female shows MRS.
- Date defaults to today in d-MMM-yy format
- Sex is available to the tag engine

Acceptance (proposed):
- Name, age/sex, referred by, date and UHID can be entered
- Choosing male shows MR., female shows MRS.
- Date defaults to today in d-MMM-yy format
- Sex is available to the tag engine
- A draft report shows no Sr. No
- Sr. No is assigned automatically when the report is issued, is shown read-only, and is never edited by the user

Open questions (current): sex/title list values; Sr. No generated or typed.
Proposed: remove the Sr. No question (answered: generated at issue, see decisions.md). Keep the sex/title question only if it is still open; WI-025 Q&A answered male/female only.

Order and dependency lines: unchanged.

## mock.md

Current: `UHID NO: [______]  Sr. No: [____]`
Proposed: `UHID NO: [______]  Sr. No: (assigned on issue)` in draft state, and `Sr. No: 112 (read-only)` in issued state.

## Related

- Issuing a report (approval before issue) belongs to REQ-273. REQ-273 is not changed here.
- docs/mock/apps/radiology-report/mock-app/mock-data/spec/screens.json (S01) lists "Sr. No" as an editable field. It needs the same change if the mock is updated.
