# Implementation plan: WI-027 (Expand normal-organ tags into findings)

Requirement: REQ-268 (approved). Decision: DEC-302. Feature: FEAT-1048.
Applications: api (primary: tag expansion logic), web (other: tag entry line)

## 1. Approach
- Add a tag expander in the api that takes the typed input (lines or a sequence of tags), maps each tag to its findings wording from the abbreviation rules, orders the output by the fixed report order (from the Sample Report), and returns unknown tags as errors instead of dropping them.
- Expose one endpoint that takes typed text and returns findings in report order plus a list of unknown tags.
- Add a tag entry line in the web app that calls the endpoint and shows the findings and any unknown tags.
- The wording must come from the abbreviation rules store (REQ-266), not from literals copied into the code. Expansion reads the store; it does not hold its own copy of the text.

## 2. Areas and files likely affected
apps/api:
- src/rules/ (expansion module, existing directory: rulesRouter.ts, rulesStore.ts, sourceRules.ts). Add a tag-expansion module here.
- src/glue/routes.ts: one endpoint for expansion.
- tests/rules/: expansion tests.

apps/web:
- src/rules/ or src/reports/ (existing directories): tag entry line component and call to the endpoint.
- src/state/rulesClient.ts: client call for expansion.
- tests/rules/: UI test for the entry line.

## 3. Behaviour to implement (from REQ-268)
- Tags: U, Li, P, PD, S, C, Mc, R, L, NF, NL.
- Report order: U(1), Li(2), P and PD(3), S(4), C and Mc(5), R(6), L(7), NF(8), NL(9). P and PD share a position. C and Mc share a position. Within a shared position, keep the typed order (to be confirmed if it matters in practice).
- R gives right kidney wording; L gives left kidney wording.
- Input: one tag per line, or a sequence of tags.
- Unknown tag: report it back to the user, do not drop it silently.
- Not in scope: Upp, SL, UB2 (not in this tag list).

## 4. Dependencies and risks
- REQ-266 (Keep abbreviation rules in one place) is finalized but not approved. Its rules store and the stored findings text for each tag are needed before this work item can read wording. Implement REQ-266 first, or this item stalls.
- Source wording must match Abbreviation Rules v4 exactly. Check each tag against the rules when writing tests.
- Ordering within a shared report position (P/PD, C/Mc) is not defined in the requirement. Assumption: keep typed order within the position.

## 5. Tests
- Each of the 11 tags returns the exact wording from the rules store (one test per tag).
- L and R return left and right kidney wording.
- Input given one per line and as a sequence gives the same result.
- Output follows report order regardless of typing order.
- An unknown tag appears in the unknown list, and the findings for the known tags are still returned.

## 6. Assumptions
- The typed input is a line in the web app (confirmed in REQ-268).
- Findings order is fixed report order (confirmed by the product owner, per REQ-268).
