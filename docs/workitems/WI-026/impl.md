# WI-026: Patient details and sex entry form (web)

Applications: web (primary, APP-021), api (other, APP-020): the web form calls the API that WI-025 builds. WI-026 changes no API code.
Requirement: REQ-267 (Enter patient details and sex) · Decision: DEC-301 · Feature: FEAT-1047
Depends on: WI-025 (the /api/reports routes, the patients and reports tables, and Sr. No allocation at issue)

Revision: this plan replaces the earlier one (Sr. No entered on the form and saved by the web; the web generating numbers). The earlier version is not kept in the repository.

## Scope split

- WI-025 (API, database): patients and reports persistence, validation, the sex code check, the UHID rule, and Sr. No allocation at issue. Owns every rule about data and numbers.
- WI-026 (web, this item): the patient-details form, display of values the API returns, and sending the form to the API. The web holds no data rules and generates no numbers.
- Not in either: issuing a report (REQ-273). Nothing in WI-026 calls an issue action.

## Sr. No on the form

- Sr. No is never an input. It is a read-only field.
- A draft (status `draft`) shows "Assigned when the report is issued". It shows no number, even if one were returned.
- An issued or cancelled report shows the `srNo` value returned by GET /api/reports/:id. The web does not compute, guess or increment it.

## Form fields and behaviour

Fields, in the order of the mock (docs/requirements/REQ-267/mock.md):
- Name: text. Sent as `name`.
- Age/Sex: an age text input and a Male / Female choice. The age is sent as `ageText` in the form "NN Y". The sex choice is sent as `sexCode`: "M" for Male, "F" for Female.
- Title label: beside the sex choice, read-only. Male shows "MR.", Female shows "MRS.". Display only (see Assumptions).
- Referred by: text, optional. Sent as `referredBy`.
- Date: defaults to today's date on a new report. Displayed in d-MMM-yy. Sent as `reportDate` in YYYY-MM-DD.
- UHID NO: text. Sent as `uhid`.
- Sr. No: read-only, as above.

Behaviour:
- New report: the form saves with POST /api/reports. The response's `report` is shown and the form then edits that report.
- Existing draft: changes save with PATCH /api/reports/:id, sending only `ageText`, `referredBy` and `reportDate`. Name, sex and UHID are not sent on PATCH, because WI-025 sets them at creation.
- Existing issued or cancelled report: every field is read-only. The web does not send PATCH for these.
- Save errors from the API are shown:
  - 422 with `details`: each field's message is shown next to the field.
  - 409 `patient-mismatch`: "This UHID belongs to a patient with a different name or sex. Check the UHID, or the name and sex." The form changes nothing.
  - 403 `not-a-radiologist`: "Your account is not linked to a radiologist record."
  - 401: "Sign in again." (The same sign-in path as the rules pages.)
- The web does no validation of its own beyond what the controls enforce (the sex choice can only be M or F). Every rule is checked by the API.

Sex for the tag engine: the sex code of the current report is kept in the report client state (see Areas), so the tag engine reads the same value the API stored.

## Date formatting

- Stored and sent: YYYY-MM-DD.
- Shown: d-MMM-yy with the day not zero-padded, for example 14-Sep-26 and 1-Mar-27.
- Month names come from a fixed English list in the helper, not from Intl or the browser locale.

## Areas and files

New (web only):
- apps/web/src/reports/reportForm.ts: pure helpers. Maps a report from the API to form values and back to the request body. Formats the date for display. Gives the title label for a sex code.
- apps/web/src/reports/PatientDetailsForm.tsx: the form (Chakra UI, as the rules pages use). Read-only Sr. No and title label.
- apps/web/src/reports/PatientDetailsPage.tsx: loads a report (or starts a new one), saves it, and shows API errors.
- apps/web/src/state/reportsClient.ts: calls /api/reports with the same request pattern as apps/web/src/state/rulesClient.ts. Reuses its getToken() for the bearer token and does not keep a second copy.

Changed:
- apps/web/src/app/router.tsx: two routes, /reports/new and /reports/:id, added at the knm:entries marker.

Tests (new):
- apps/web/tests/reports/reportForm.test.ts: date display (including a day below 10), mapping to and from the request body, title labels, and no Sr. No input on the form model.
- apps/web/tests/reports/PatientDetailsForm.test.tsx: no Sr. No input on the form; a draft shows "Assigned when the report is issued"; an issued report shows its srNo; Male shows MR. and Female shows MRS.; a new report sends POST with the expected body; a draft PATCH sends only the three fields; a 409 shows the mismatch message.

## Behaviour to verify

- The form has no input for Sr. No, and no code in apps/web computes or increments a number.
- A draft shows no Sr. No.
- An issued report shows the API's srNo.
- Male → MR.; Female → MRS.
- The date defaults to today and is displayed as d-MMM-yy.
- A new report is sent with sexCode M or F; a PATCH sends only ageText, referredBy and reportDate.
- A 409 patient-mismatch shows the message and keeps the entered values.

## Assumptions

- The title label (MR. / MRS.) is kept in the web as a display constant. The source of truth is the `title` column of the sexes table, which the API does not return in WI-025's response. This is a display label, not validation or persistence. If the owner wants one source, WI-025 must add `title` to the report response; that change is not made here.
- Age is stored as entered, "NN Y". The API does not check it (WI-025: no validation specified).
- Name, Referred by and UHID are free text. Their checks belong to the API.
- A day below 10 is shown without a leading zero (d, not dd). The sources say d-MMM-yy and do not settle this; the example in the sources is 14-Sep-26, so the choice does not show there.
- Edits are allowed only while the report is a draft. The sources do not say this; it follows from WI-025's PATCH rule.
- The sex list in the form is Male and Female, from the answered Q&A.

## Open points and conflicts (not decided here)

- The Sr. No decisions of 2026-11-12 are user-authorized for planning, not confirmed by the Product Owner. The Product Owner's confirmation is needed before the form relies on them.
- REQ-267 req.md and mock.md (approved) still list Sr. No as an entered field. The proposed corrections are in docs/requirements/REQ-267/proposed-changes.md and are not applied.
- The WI-026 record in KNM still has the description "Patient header form (name, age/sex, referred by, date, UHID, Sr. No.)". That is a finalized KNM record and is not edited here. The owner should correct it in KNM.
- The tag engine is not in the web app yet. WI-026 only exposes the sex code to it.
- The API's sex title source (see Assumptions) may need to be returned by WI-025 if the owner wants one source.
