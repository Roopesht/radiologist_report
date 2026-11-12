# Source check: Abbreviation Rules v4 (source 133) for WI-024

Source: docs/project/source/133. Abbreviation Rules v4.docx (one table, 49 rows; 3 rows are empty).
Checked by reading the document's table cell by cell. Rule: seed only what is unambiguous. Everything else waits for clarification; nothing is guessed, corrected or merged.

## Seeded (18 rules, wording copied exactly)

| Tag | Organ (derived) | Sex | Impression | Note |
|---|---|---|---|---|
| B | Uterus | | | |
| c | Gall bladder | | | lower-case in the source; kept |
| Li | Liver | | | normal wording only; size, grade and sex option sets are NOT seeded (see blockers) |
| Mc | Gall bladder | | | |
| MML | Mesenteric lymph nodes | | Mild Mesenteric Lymphadenopathy. | |
| NF | Peritoneal cavity | | | |
| NL | Lymph nodes | | | |
| O | Ovaries | F | | sex from docs/project/db_design.md (source has no sex marker) |
| LOP | Left ovary | F | | sex from design |
| ROP | Right ovary | F | | sex from design |
| P | Pancreas | | | |
| PC | Pancreas | | cect abdomen to confirm or exclude pancreatic calcification. | first PC row only (see blockers) |
| PD | Pancreas | | | |
| PR | Prostate | M | | sex from design |
| S | Spleen | | | |
| U | Urinary bladder | | | |
| UME | Uterus | | | |
| UNV | Uterus | | | |

Organ is required by the design and is not in the source: it is taken from the tag's subject. Sex for PR, O, ROP and LOP comes from docs/project/db_design.md ("PR male, O/ROP/LOP female"), not from the source. Please confirm both.

## Not seeded: waiting for clarification

Rows in source order. "No code" means the tag cell is empty.

| # | Tag as written | Why not seeded |
|---|---|---|
| 1 | ADPKD | Measurement symbol "�" in the findings ("measures�") |
| 2 | (no code) | Gall bladder calculi with "hundreds calculi" and "15 mm"; no tag code |
| 3 | (no code) | Gall bladder "19.3 mm Calculus ... Obstructive cholecystitis"; no tag code, specific measurement |
| 4 | DS | No findings text: only the impression "Dengue Syndrome" and the list of impressions to remove (REQ-274) |
| 5 | Ecfwfc wpcoew | Garbled tag code |
| 6 | (no code) | Endometrial fluid, impression "? chronic hematometra"; no tag code |
| 7 | Ga | Blanks "....", "..." in the findings and the misspelling "odematous"; the blank-filling rule is not defined yet (REQ-271/272) |
| 8 | HSOCS SS AA LP LMA� | Garbled tag code; placeholder "�" in findings |
| 9 | [L,R] | A side option set, not a tag code; the rule it belongs to is unknown |
| 10 | [L, R]5-14.99[u, um, m, lm, l] | Side, size range and calyx option sets in one cell; no tag code; placeholder "�" |
| 11 | (no code) | Kidney cysts with "[Male, female]"; no code; blanks and "�" |
| 12 | Li (option sets) | Size ranges per sex are not assigned (REQ-270 open); the grade list "mildly ... markedly" and the impression list "Mild ... Marked" differ in spelling and are not paired by the source; "(�.. cm)" placeholder |
| 13 | Li (second row) | Same as 12: "[Male, female]" grade with a size placeholder |
| 14 | LMOT | "[Male, female]" marker with a single text; unclear whether the text applies to both sexes |
| 15 | (no code) | Pancreas lymph node mass "measuring �� cms"; no tag code; the second PC row |
| 16 | SL | Two sentences merged: the spleen text and the left kidney text; not combined on assumption |
| 17 | UB2 | Blanks "�.. cc." and "optimal amount is 400 cc"; placeholder |
| 18 | UB3 | Blanks, placeholder "�" in the impression |
| 19 | BU | Blanks "....."; placeholder |
| 20 | Upp | Code meaning unknown (db_design_tables.csv open question REQ-268/271/272); "[Male]"; two sentences (bladder and prostate) |
| 21 | UU | Two sentences merged (bladder and uterus) |
| 22 | (no code) | "Urinary bladder: Lot of sludge seen", impression "Cystitis"; no tag code |
| 23 | (section RT ADNEXA) | Section label, not a tag; placeholder "�"; impression "? Right adnexal mass" (uncertain) |
| 24 | (no code) | Free fluid right side and pelvis with blanks "......" and "...."; no tag code |
| 25 | (no code) | "Moderate free fluid is seen in POD", impression "Pelvic inflammatory disease"; no tag code |
| 26 | MILD RPOC (section) | Multi-word label, not a code; unclear whether it is a tag |
| 27 | NECK (section) | Section label; several sentences with counts; impression "? Thyroiditis. ? Mitotic activity." (uncertain) |
| 28 | SCROTUM (section) | Section label; uncertain impression "? Right side inguinal hernia" |
| 29 | ..... cm cds apa | Garbled tag code; placeholder "�.. cms" in the findings |
| 30 | VENOUS DOPPLER (section) | Section label; several sentences; impression "DVT as described." (unfinished wording) |

## Clarifications needed from the product owner or the clinic

1. What the symbol "�" stands for (a measurement blank?) and the exact blank syntax used by the reports.
2. The correct tag codes for rows 2, 3, 6, 11, 15, 22, 24, 25: these have no code in the source.
3. What the garbled codes are: "Ecfwfc wpcoew", "HSOCS SS AA LP LMA�", "..... cm cds apa".
4. Whether "[L,R]", "[L, R]5-14.99[...]" and "[Male, female]" kidney rows are the same tag, and which tag code they belong to.
5. Liver: the size range set per sex (REQ-270), and whether the grade wording should follow the findings list or the impression list ("mild to moderately" vs "Mild to Moderate").
6. Whether SL and UU are one rule each (their two sentences belong to two organs) or whether the second sentence is a separate tag.
7. Whether "Upp", "MILD RPOC", "NECK", "SCROTUM" and "VENOUS DOPPLER" are tags or section headings, and what the "Upp" code means.
8. Whether PC has a second wording (the pre-pancreatic lymph node row) under the same code.
9. The sex of PR, O, ROP, LOP: confirm the design's assignment, since the source does not say.

## Duplicate wording outside the rules store

- docs/mock/apps/radiology-report/mock-app/mock-data/seeds/create-report.json contains "Pancreas is normal in size and echotexture. Main pancreatic duct is normal." (reference mock, not changed, per the brief).
- docs/requirements/REQ-266/mock.md and docs/requirements/REQ-268/mock.md quote the Liver, Pancreas and Spleen wording in documentation (not code, not changed).
- No report-generation code exists in the tracked files, so no duplicated wording in production code was found.
