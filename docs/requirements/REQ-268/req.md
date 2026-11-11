# Expand normal-organ tags into findings

Order: 3 of 9
Depends on: 1 (rules in one place)

## Purpose
As a radiologist, I can type normal-organ tags (Li, P, S, L, R, U, NF, NL, C, Mc, PD) and get the findings wording.

## Why
Normal whole-abdomen report in a few keystrokes (G1, G3). Source: Abbreviation Rules v4, sample.jpeg.

## Behaviour and acceptance
Acceptance:
- Each listed tag gives exactly the wording in the abbreviation rules
- L and R give left and right kidney wording
- Tags are accepted one per line or in a sequence
- Unknown tag is reported, not silently dropped
- Findings appear in report order, not typing order (to confirm)

## Order
3 of 9 (after 1: reads the rules)

## Source documents
docs/project/source/ (Abbreviation Rules v4, whole-abdomen male/female reports, sample report, sample.jpeg)

## Open questions
- What do Upp, SL, UB2 mean? (SL has the same text as S)
- Findings order: typing order or fixed report order?
- Input channel: typed line in an app, or chat like the WhatsApp screenshot?
- PO (Pankaj) to answer before approval.
