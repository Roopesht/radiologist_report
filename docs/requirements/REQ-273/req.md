# Get a complete report in the signed format

Order: 8 of 9
Depends on: 2, 3, 4, 5, 6, 7

## Purpose
As a radiologist, I can get a complete report with header, findings, impression, signature and the note.

## Why
Output must match current signed reports (G2). Source: 127, 128 reports.

## Behaviour and acceptance
Acceptance:
- Header: DEPARTMENT OF RADIODIAGNOSIS, patient fields, ULTRASOUND WHOLE ABDOMEN
- Findings and impression follow the signed report layout
- Signature block: Dr. Pankaj Singhal, MD Radio Diagnosis, Senior Consultant, HMC - HN004918
- Footer: Note: Not valid for medico legal purposes.
- No AI diagnosis or image interpretation is added

## Order
8 of 9 (after 3-7: assembles the output)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- Output format: screen, .docx, PDF or print? (sources give .docx reports)
- Is the signing doctor fixed or chosen per report?
- Should the radiologist review or approve before issue?
- PO (Pankaj) to answer before approval.
