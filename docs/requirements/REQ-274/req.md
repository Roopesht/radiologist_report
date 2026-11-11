# Get one combined impression

Order: 9 of 9
Depends on: 8 (report output)

## Purpose
As a radiologist, I get one impression for the whole report.

## Why
The impression must be correct every time (G1). Source: Abbreviation Rules v4 (DS removal rule), 127/128, sample report.

## Behaviour and acceptance
Acceptance:
- All normal gives "USG whole abdomen reveals no obvious abnormality."
- Abnormal impressions from tags are combined in one IMPRESSION line (sample: "Mild Hepatomegaly.")
- With DS, impressions of Hepatomegaly, Splenomegaly and Hepatosplenomegaly are removed
- The normal-abdomen sentence is not shown when an abnormal impression exists

## Order
9 of 9 (after 8: fills the impression part)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- Does the removal rule apply only with DS or also with other tags?
- Order and wording when several abnormal impressions are joined?
- PO (Pankaj) to answer before approval.
