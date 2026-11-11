# Expand pathology tags into findings and impression

Order: 7 of 9
Depends on: 3 (normal-organ tags)

## Purpose
As a radiologist, I can type pathology tags (gallbladder calculi, ADPKD, DS, PC, LMOT and similar) and get findings and impression.

## Why
Abnormal findings need correct wording and impression (G1). Source: Abbreviation Rules v4.

## Behaviour and acceptance
Acceptance:
- ADPKD gives both-kidney cysts wording and the impression autosomal dominant polycystic kidney disease
- PC gives subtle pancreatic tail calcification wording and the cect advice impression
- LMOT gives left hydroureteronephrosis wording and the ureteric calculus impression
- DS gives the impression Dengue Syndrome
- Blank "...." measurements are filled from what the radiologist types

## Order
7 of 9 (after 3: uses the tag engine)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- Several entries have no visible tag: gallbladder calculi (hundreds, 15 mm), obstructive cholecystitis, Ga (mucocele/pyocele), endometrial fluid, pre-pancreatic lymph node mass, hepatic cysts. What are their tags?
- Meaning of HSOCS SS AA LP LMA and Ecfwfc wpcoew?
- Syntax for entering the "...." measurements?
- PO (Pankaj) to answer before approval.
