# WI-028: Expand sex-specific tags (PR, UT, O, ROP, LOP)

Applications: api (primary), web (other)
Requirement: REQ-269 (approved). Decision: DEC-303. Feature: FEAT-1049.
Written for: the developer implementing REQ-269 in this repository.

## Status of this plan
Incomplete. The clinical findings sentence for the `UT` tag is **Pending radiologist approval**. It has not been provided or approved, so it is not written into any rule, seed, test fixture or document. The sample report sentence ("Uterus is normal in size, normal shape and echotexture. ET thickness is normal.") is not approved wording.

## Confirmed decisions (from the Q&A on WI-028)
1. The female uterus line uses the tag `UT`.
2. `UT` sits immediately after `U`, in the same position group as `PR`, `O`, `ROP` and `LOP`.
3. `O` cannot be combined with `ROP` or `LOP`. Such combinations are rejected. `ROP` and `LOP` together are not covered by the answer and are treated as allowed (see pending items).
4. A tag for the other sex is rejected with a message.

## Approach
- **API (primary).** Tag expansion (`apps/api/src/rules/tagExpansion.ts`) gains:
  - report positions for `PR`, `UT`, `O`, `ROP` and `LOP` in one group after `U`;
  - an optional patient sex (`M` or `F`). When given, a tag whose rule is for the other sex is reported as `wrong-sex` and not expanded;
  - the `O` with `ROP` or `LOP` rule, which reports all three tokens as `ovary-combination` and expands none of them.
  The expand route (`apps/api/src/rules/rulesRouter.ts`) accepts an optional `sexCode` and rejects any value other than `M` or `F`.
  Sex-specific rules already exist in the seed (`apps/api/src/rules/sourceRules.ts`): `PR` for M; `O`, `ROP` and `LOP` for F.
- **Web (other).** The tag-entry panel (`apps/web/src/rules/TagEntryPanel.tsx`) shows a message for each new reason. The client type (`apps/web/src/state/rulesClient.ts`) carries the new reasons.
- **Rules.** The `UT` rule (organ Uterus, sex F, findings wording pending radiologist approval) is created only after the sentence is approved. Until then, typing `UT` reports `no-rule`.

## Areas and files likely affected
- `apps/api/src/rules/tagExpansion.ts` (positions, sex check, ovary rule, reason types): changed in working tree.
- `apps/api/src/rules/rulesRouter.ts` (optional `sexCode` on the expand route): changed in working tree.
- `apps/api/tests/rules/expansion.test.ts` (new cases for the sex check, the ovary rule, group order and `UT`): changed in working tree.
- `apps/web/src/rules/TagEntryPanel.tsx` and `apps/web/src/state/rulesClient.ts` (reason messages): changed in working tree.
- `apps/api/src/rules/sourceRules.ts`: no change planned until the `UT` sentence is approved; then a `UT` entry is added with sex F and the approved wording.

## Risks
- **Unapproved clinical wording.** A `UT` line must not be produced until the radiologist approves the sentence. Risk: a finding goes into a report without approval. Mitigation: no `UT` rule until approval; `UT` reports `no-rule` until then.
- **Sex is not sent from the web UI.** The panel does not pass the patient's sex yet, so the sex rejection applies only to API callers that send `sexCode`. Risk: the web user can type `PR` for a female patient and get wording. Mitigation: wire the sex through the web panel (pending item).
- **Position group ordering.** Typed order is kept inside a shared position (as for `P`/`PD`). Positions are placed at 1.5 so existing positions 1 to 9 do not change.

## Assumptions
- `ROP` and `LOP` may be typed together (the answer covers only `O` with `ROP` or `LOP`).
- The patient's sex is one of `M` or `F`, as in the `sexes` table.
- The sex rejection and ovary rejection use the same reason mechanism as other unexpanded tags, shown to the user as a message.

## Pending (unresolved details)
1. **Pending radiologist approval: the `UT` findings sentence.** Not provided. Blocks the `UT` rule and the finalized plan.
2. **`ROP` with `LOP`.** Not answered. Assumed allowed; confirm.
3. **Sex in the web UI.** The panel must send the patient's sex. Not decided where the sex comes from in the tag-entry screen.
4. **Verification.** The current working-tree changes have not been tested: `npm ci` in `apps/api` failed on a locked native file (`@libsql/win32-x64-msvc/index.node`), so jest and TypeScript are not available yet.
5. **KNM status.** WI-028 shows `finalized` in KNM, but this plan was not complete when it was moved. Confirm whether the status should stay as it is until the `UT` sentence is approved.
6. **Working tree.** Changes are uncommitted; nothing has been committed or pushed.

## Acceptance (from REQ-269)
- `PR` gives prostate wording for a male patient.
- `O` gives both ovaries wording; `ROP` gives right ovary wording; `LOP` gives left ovary wording, for a female patient.
- A tag for the other sex is rejected with a message.
- The female uterus line has a tag: `UT` (wording pending radiologist approval).
- `O` with `ROP` or `LOP` is rejected.
