# Expand normal-organ tags into findings

Order: 3 of 9
Depends on: 1 (rules in one place)

## Purpose
As a radiologist, I can type normal-organ tags (Li, P, S, L, R, U, NF, NL, C, Mc, PD) and get the findings wording.

## Why
Normal whole-abdomen report in a few keystrokes (G1, G3). Source: Abbreviation Rules v4, sample.jpeg.

## Input
Tags are typed as a line in the app. Tags can be given one per line or in a sequence.

## Behaviour and acceptance
- Each listed tag gives exactly the wording in the abbreviation rules (Abbreviation Rules v4).
- Findings appear in fixed report order (order of the Sample Report), not in typing order.
- L and R give left and right kidney wording.
- Tags are accepted one per line or in a sequence.
- Unknown tag is reported, not silently dropped.

## Tags and wording
Findings are listed here in report order.

| Report order | Tag | Finding (exact wording from the rules) |
|---|---|---|
| 1 | U | Urinary bladder is adequately distended. Wall thickness is normal. No intraluminal calculus or mass lesion seen. |
| 2 | Li | Liver is normal in size and shows normal echotexture. No focal mass lesion seen. Intrahepatic biliary radicals are normal. Portal vein is normal. |
| 3 | P | Pancreas is normal in size and echotexture. Main pancreatic duct is normal. |
| 3 | PD | Pancreas not clearly visualized due to overlying bowel gases. |
| 4 | S | Spleen is normal in size and parenchymal echotexture. No focal mass lesion seen. |
| 5 | C | Gall bladder is contracted (presumably post prandial). |
| 5 | Mc | Gall bladder is markedly contracted (presumably post prandial). |
| 6 | R | Right kidney is normal in size, shape and echogenicity. Cortico-medullary differentiation is maintained. No evidence of calculus or hydronephrosis is seen. |
| 7 | L | Left kidney is normal in size, shape and echogenicity. Cortico-medullary differentiation is maintained. No evidence of calculus or hydronephrosis is seen. |
| 8 | NF | No free fluid is seen in peritoneal cavity. |
| 9 | NL | No significant mesenteric or retroperitoneal lymphadenopathy seen. |

Tags with the same report order (P and PD; C and Mc) share that position in the report.

## Order
3 of 9 (after 1: reads the rules)

## Source documents
docs/project/source/ (Abbreviation Rules v4, Sample Report (2), whole-abdomen male/female reports, sample.jpeg)

## Resolved questions
- Findings order: fixed report order, from the Sample Report (confirmed by the product owner).
- Input channel: typed line in the app (confirmed by the product owner).
- Upp, SL, UB2: not in this requirement's tag list, so out of scope here.
