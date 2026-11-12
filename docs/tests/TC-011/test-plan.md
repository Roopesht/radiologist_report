# Test plan: Patient details and sex header entry (TC-011)

Requirement: REQ-267 - Enter patient details and sex
Work item: none linked

## Scope
Patient header on the report form: name, age/sex, referred by, date, UHID and Sr. No.
Sex selects the title (MR./MRS.) and is available to the tag engine.

Out of scope until the open questions in REQ-267 are answered:
- Sex values other than male and female.
- Whether Sr. No is generated or typed.

## Scenarios

### S1 - All header fields can be entered
Precondition: a new report is open on the patient details header.
Steps:
1. Enter Name, Age, Sex, Referred by, Date, UHID and Sr. No. with sample values.
2. Save or leave the header and reopen it.
Expected: every field keeps the entered value. Nothing is dropped or truncated.

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
Precondition: a new report is opened on a known date (for example 14-Sep-26).
Steps:
1. Open a new report without touching the Date field.
Expected: Date shows today's date in d-MMM-yy format (for example "14-Sep-26").

### S6 - Date can be changed
Steps:
1. Overwrite the default Date with another valid date.
Expected: the entered date is kept and displayed in d-MMM-yy format.

### S7 - Sex is available to the tag engine
Steps:
1. Select Sex = Male and run the tag engine for a sex-specific tag.
2. Repeat with Sex = Female.
Expected: the tag engine receives the selected sex for both values and resolves the sex-specific tags accordingly.

## Pass criteria
All scenarios S1 to S7 pass. Any failure blocks the requirement's acceptance.
