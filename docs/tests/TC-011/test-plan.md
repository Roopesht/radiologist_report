# Test plan: Patient details and sex header entry (TC-011)

Requirement: REQ-267 - Enter patient details and sex
Work item: none linked
Revision: S7 (sex-specific tag engine) moved to TC-012, which is deferred until the tag engine exists.

## Scope
Patient header on the report form: name, age/sex, referred by, date, UHID and Sr. No.
Sex selects the title (MR./MRS.). The date is shown in d-MMM-yy.

Out of scope until the open questions in REQ-267 are answered:
- Sex values other than male and female.
- Whether Sr. No is generated or typed. (A draft shows "Assigned when the report is issued"; no number is entered on the form.)

## Scenarios

### S1 - A saved new report reopens with every header field preserved
Precondition: no report is open.
Steps:
1. Open a new report. Enter Name, Age, Sex (Male), Referred by, Date and UHID with sample values.
2. Save patient details.
3. Leave the screen and open the saved report again from its address.
Expected:
- The save creates the report as a draft.
- After reopening, every field shows the value that was saved: Name, Age, Sex (Male), Title (MR.), Referred by, Date, UHID.
- Sr. No shows "Assigned when the report is issued".

### S2 - Male shows MR.
Steps:
1. Select Sex = Male.
Expected: the title shown is "MR.".

### S3 - Female shows MRS.
Steps:
1. Select Sex = Female.
Expected: the title shown is "MRS.".

### S4 - Switching sex updates the title
Steps:
1. Select Sex = Male, then change it to Female.
Expected: the title changes from "MR." to "MRS.". No stale title remains.

### S5 - Date defaults to today in d-MMM-yy
Precondition: a new report is opened.
Steps:
1. Open a new report without touching the Date field.
Expected: the Date field holds today's date, and the text under it shows today's date in d-MMM-yy (for example "Shown as 14-Sep-26" when today is 14 Sep 2026).

### S6 - A changed date is saved and shown again
Precondition: a saved draft exists with Date 12-Nov-26.
Steps:
1. Change the Date to 20-Nov-26 on screen. The text under the field shows "Shown as 20-Nov-26".
2. Save changes.
3. Leave the screen and open the same report again.
Expected:
- The save sends the new date.
- After the save, the screen shows "Shown as 20-Nov-26".
- After reopening, the Date field holds 2026-11-20 and shows "Shown as 20-Nov-26".

## Automated coverage
- S1, S6 (screen save and reopen): apps/web/tests/reports/TC011.screen.test.tsx
- S2 to S5 (titles, date default and display): apps/web/tests/reports/PatientDetailsForm.test.tsx
- Save, PATCH body and API rules: apps/web/tests/reports/reportForm.test.ts and apps/api/tests/reports/*.test.ts

## Pass criteria
All scenarios S1 to S6 pass. Any failure blocks the requirement's acceptance.
