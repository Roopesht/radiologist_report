# Expand sex-specific tags

Order: 4 of 9
Depends on: 2 (sex), 3 (tag engine)

## Purpose
As a radiologist, I can type PR for a male patient and O, ROP, LOP for a female patient and get the matching findings.

## Why
Male and female reports differ (prostate vs uterus/ovaries). Source: 127, 128, Abbreviation Rules v4.

## Behaviour and acceptance
Acceptance:
- PR gives prostate wording for a male patient
- O gives both ovaries, ROP right ovary, LOP left ovary wording for a female patient
- A tag for the other sex is rejected with a message
- The female uterus line has a tag (see open questions)

## Order
4 of 9 (after 2 and 3: needs sex and the tag engine)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- What is the tag for the uterus line in the female report?
- Should O together with ROP or LOP be allowed?
- PO (Pankaj) to answer before approval.
