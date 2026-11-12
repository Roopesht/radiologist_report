# Test plan: Sex-specific tag engine integration (TC-012) - DEFERRED

Status: BLOCKED / DEFERRED. Not run. Not passed.
Blocker: the tag engine is not implemented in the web or API code. WI-026 records this: "The tag engine is not in the web app yet. WI-026 only exposes the sex code to it."
Split from: TC-011, scenario S7 (moved here by the product owner's decision).
Requirement: REQ-267 - Enter patient details and sex
Work item: none linked

## Scope
The sex code of the report on screen (M or F) reaches the tag engine, and the engine resolves sex-specific tags from it.

## Scenarios (to run once the tag engine exists)

### D1 - Male reaches the tag engine
Steps:
1. On the patient-details form, select Sex = Male and save.
2. Run the tag engine for a sex-specific tag.
Expected: the engine receives sexCode "M" and resolves the male variant of the tag.

### D2 - Female reaches the tag engine
Steps:
1. Select Sex = Female and save.
2. Run the tag engine for the same sex-specific tag.
Expected: the engine receives sexCode "F" and resolves the female variant of the tag.

### D3 - Changing sex on a draft changes what the engine receives
Note: name and sex are fixed at creation for a saved draft (WI-026, Behaviour). This scenario only applies if the owner allows a sex change; until then it is not in scope.

## Pass criteria
D1 and D2 pass against the real tag engine. Until the tag engine exists this test cannot pass and must not be marked passed.
