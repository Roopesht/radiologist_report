# Test plan: TC-013 Normal-organ tag expansion (REQ-268)

Requirement: REQ-268 (approved). Work item: WI-027 (implemented).
Applications: api (expansion endpoint), web (tag entry screen at /rules/expand, dashboard menu entry).
Expected wording: REQ-268 req.md, "Tags and wording" table (exact text).

Known gap: L and R have no rules in the store yet (WI-027 section 7). Scenarios TC-013-02 and TC-013-07 are expected to FAIL until the kidney rules are entered. Do not mark TC-013 passed while they fail.

Not covered (requirement does not define it): the order of P/PD and C/Mc within their shared report position. No scenario is written for it.

## Scenarios

### TC-013-01 Each tag gives exactly the wording in the rules
Steps: For each of Li, P, PD, S, U, NF, NL, C, Mc, send POST /api/rules/expand with body {"text":"<tag>"} as a radiologist.
Expected: one finding for the tag; findingsText equals the REQ-268 table text character for character (C matches rule code "c" case-insensitively).

### TC-013-02 L and R give left and right kidney wording (EXPECTED FAIL until rules exist)
Steps: POST {"text":"L\nR"}.
Expected: findings are R (position 6) then L (position 7); R text is "Right kidney is normal in size, shape and echogenicity. Cortico-medullary differentiation is maintained. No evidence of calculus or hydronephrosis is seen."; L text is the same with "Left kidney".
Current result: unknown with reason "no-rule" for both.

### TC-013-03 Tags accepted one per line
Steps: POST {"text":"Li\nP\nS"}.
Expected: three findings, Li, P, S, with no unknown tags.

### TC-013-04 Tags accepted in a sequence
Steps: POST {"text":"Li P S"} and POST {"text":"Li, P, S"}.
Expected: same three findings as TC-013-03 in both forms.

### TC-013-05 Findings in report order, not typing order
Steps: POST {"text":"NL\nLi\nU"}.
Expected: findings in order U (1), Li (2), NL (9).

### TC-013-06 Unknown tag is reported, not dropped
Steps: POST {"text":"Li\nXX\nS"}.
Expected: findings Li and S; unknown contains {"token":"XX","reason":"not-a-normal-organ-tag"}.

### TC-013-07 A normal-organ tag with no rule is reported (EXPECTED FAIL for L and R until rules exist)
Steps: POST {"text":"Upp"}, and POST {"text":"L"} while L has no rule.
Expected: Upp is reported as not-a-normal-organ-tag (out of scope). L is reported with reason "no-rule" and not silently dropped.

### TC-013-08 A repeated tag gives its finding once
Steps: POST {"text":"Li\nLi\nli"}.
Expected: one Li finding; no unknown tags.

### TC-013-09 Empty input
Steps: POST {"text":"  \n "}.
Expected: findings [] and unknown [].

### TC-013-10 Access and input validation
Steps: POST without a token; POST with a reporter token; POST {"text":42}; POST text longer than 2000 characters.
Expected: 401; 403; 422 validation-failed; 422 validation-failed.

### TC-013-11 Tag entry screen from the dashboard
Steps: Open the dashboard. Choose "Open" on "Expand normal-organ tags". Leave the text box empty, then type "Li" and select Expand.
Expected: Expand is disabled while the box is empty. After Expand, the Liver finding is shown with badge Li, and unknown tags are listed under "Not expanded".

### TC-013-12 Tags typed on separate lines in the screen
Steps: On /rules/expand, type "P" and "S" on two lines and select Expand.
Expected: Pancreas finding then Spleen finding, in that order.
