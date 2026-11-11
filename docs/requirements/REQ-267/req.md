# Enter patient details and sex

Order: 2 of 9
Depends on: 1 (rules in one place)

## Purpose
As a radiologist, I can enter name, age/sex, referred by, date, UHID and Sr. No.

## Why
The report header carries patient details and sex selects MR./MRS. and sex-specific organs. Source: 127/128 whole-abdomen reports.

## Behaviour and acceptance
Acceptance:
- All header fields from the signed report can be entered
- Choosing male shows MR., female shows MRS.
- Date defaults to today in d-MMM-yy format
- Sex is available to the tag engine

## Order
2 of 9 (after 1: sex drives sex-specific tags)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- Is the sex/title list only male/female, or are other values needed?
- Is Sr. No generated or typed?
- PO (Pankaj) to answer before approval.
